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
                .build();
        } catch (AuthenticationException ex) {
            rateLimiterService.loginFailed(clientIp);
            
            AdminActivity activity = AdminActivity.builder()
                    .action("LOGIN_FAILED")
                    .entityType("AUTH")
                    .entityId(0L)
                    .description("IP: " + clientIp)
                    .build();
            activityRepository.save(activity);
            
            throw ex;
        }
    }
}
