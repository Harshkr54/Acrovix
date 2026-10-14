package com.acrovix.admin.service;

import com.acrovix.admin.dto.AuthRequest;
import com.acrovix.admin.dto.AuthResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.repository.AdminActivityRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.AuthenticationException;
import com.acrovix.admin.exception.RateLimitExceededException;

import java.time.LocalDateTime;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Optional;

import com.acrovix.admin.entity.PasswordResetToken;
import com.acrovix.admin.repository.PasswordResetTokenRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AdminUserRepository repository;
    private final AdminActivityRepository activityRepository;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;
    private final LoginRateLimiterService rateLimiterService;
    private final NotificationService notificationService;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${acrovix.app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public AuthResponse authenticate(AuthRequest request, String clientIp) {
        if (rateLimiterService.isRateLimited(clientIp)) {
            AdminActivity activity = AdminActivity.builder()
                    .action("LOGIN_RATE_LIMITED")
                    .entityType("AUTH")
                    .entityId(0L)
                    .description("IP: " + clientIp)
                    .build();
            activityRepository.save(activity);
            
            throw new RateLimitExceededException("Too many login attempts. Please try again later.");
        }

        try {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        AdminUser user = (AdminUser) authentication.getPrincipal();

        rateLimiterService.loginSucceeded(clientIp);

        user.setLastLogin(LocalDateTime.now());
        repository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(user.getId())
                .action("Admin logged in")
                .entityType("AUTH")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);

        var jwtToken = jwtUtil.generateToken(user);
        try {
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            emailService.sendLoginSecurityEmailAsync(user.getEmail(), user.getName(), LocalDateTime.now().format(formatter));
        } catch (Exception e) {
            // Email failure should not break login
        }

        return AuthResponse.builder()
                .token(jwtToken)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .mustChangePassword(user.isMustChangePassword())
                .build();
        } catch (AuthenticationException ex) {
            rateLimiterService.loginFailed(clientIp);
            
            try {
                AdminActivity activity = AdminActivity.builder()
                        .action("LOGIN_FAILED")
                        .entityType("AUTH")
                        .entityId(0L)
                        .description("IP: " + clientIp)
                        .build();
                activityRepository.save(activity);
            } catch (Exception e) {
                // Activity logging failure should not suppress auth failure
            }
            
            throw ex;
        }
    }

    @Transactional
    public void requestPasswordReset(String email) {
        requestPasswordResetWithResult(email);
    }

    @Transactional
    public com.acrovix.admin.dto.email.EmailDispatchResult requestPasswordResetWithResult(String email) {
        Optional<AdminUser> userOpt = repository.findByEmail(email);
        if (userOpt.isEmpty() || !userOpt.get().isEnabled()) {
            org.slf4j.LoggerFactory.getLogger(AuthService.class).info("Password reset requested for non-existent or disabled account: {}", maskEmail(email));
            return com.acrovix.admin.dto.email.EmailDispatchResult.accepted("Request processed.");
        }

        AdminUser user = userOpt.get();
        org.slf4j.LoggerFactory.getLogger(AuthService.class).info("Password reset token generating for user: {}", maskEmail(user.getEmail()));

        // Invalidate previous active tokens for this user
        java.util.List<PasswordResetToken> existingTokens = passwordResetTokenRepository.findByAdminUserAndUsedFalse(user);
        for (PasswordResetToken token : existingTokens) {
            token.setUsed(true);
        }
        if (!existingTokens.isEmpty()) {
            passwordResetTokenRepository.saveAll(existingTokens);
        }

        String rawToken = generateSecureToken();
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .tokenHash(tokenHash)
                .adminUser(user)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();
        
        passwordResetTokenRepository.save(resetToken);

        String baseUrl = (frontendUrl != null && !frontendUrl.isBlank()) ? frontendUrl.trim() : "http://localhost:5173";
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }

        String resetLink = baseUrl + "/reset-password?token=" + rawToken;
        
        if (emailService.isEmailConfigured()) {
            emailService.sendPasswordResetEmailAsync(user.getEmail(), resetLink);
            return com.acrovix.admin.dto.email.EmailDispatchResult.accepted("Password reset link accepted by provider for delivery.");
        } else {
            org.slf4j.LoggerFactory.getLogger(AuthService.class).warn("Email provider unconfigured. Reset link generated but could not be sent.");
            return com.acrovix.admin.dto.email.EmailDispatchResult.unconfigured("Email service is not configured on this server.");
        }
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String tokenHash = hashToken(rawToken);
        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException("Password reset link is invalid or has expired."));

        if (resetToken.isUsed() || resetToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Password reset link is invalid or has expired.");
        }

        AdminUser user = resetToken.getAdminUser();
        if (!user.isEnabled()) {
            throw new IllegalArgumentException("Password reset link is invalid or has expired.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(false);
        repository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(user.getId())
                .action("Password reset completed")
                .entityType("AUTH")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);
    }

    @Transactional
    public void forceChangePassword(AdminUser user, com.acrovix.admin.dto.ForceChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("New passwords do not match.");
        }
        if (request.getNewPassword().length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters long.");
        }
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Current password is incorrect.");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new IllegalArgumentException("New password cannot be the same as your current temporary password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        repository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(user.getId())
                .action("Forced temporary password updated by user")
                .entityType("AUTH")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int atIndex = email.indexOf("@");
        if (atIndex <= 1) return "***" + email.substring(atIndex);
        return email.charAt(0) + "***" + email.substring(atIndex - 1);
    }

    private String generateSecureToken() {
        SecureRandom random = new SecureRandom();
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return java.util.HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }
}
