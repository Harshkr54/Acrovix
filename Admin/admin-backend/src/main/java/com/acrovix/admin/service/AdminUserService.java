package com.acrovix.admin.service;

import com.acrovix.admin.dto.AdminUserRequest;
import com.acrovix.admin.dto.AdminUserResponse;
import com.acrovix.admin.dto.ChangePasswordRequest;
import com.acrovix.admin.dto.UpdateProfileRequest;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AdminUserRepository userRepository;
    private final AdminActivityRepository activityRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuthService authService;
    private final com.acrovix.admin.repository.PasswordResetTokenRepository passwordResetTokenRepository;

    private AdminUserResponse mapToResponse(AdminUser user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .mustChangePassword(user.isMustChangePassword())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .build();
    }

    public List<AdminUserResponse> getAllUsers() {
        return getAllUsers(null);
    }

    public List<AdminUserResponse> getAllUsers(Boolean enabled) {
        if (enabled == null) {
            return userRepository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
        }
        return userRepository.findByEnabled(enabled).stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public AdminUserResponse getUserById(Long userId) {
        AdminUser user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse createUser(AdminUserRequest request, Long adminId) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResourceConflictException("Email already exists");
        }

        AdminUser user = AdminUser.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.valueOf(request.getRole()))
                .enabled(true)
                .build();

        AdminUser saved = userRepository.save(user);
        
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Created admin user: " + saved.getEmail())
                .entityType("AdminUser")
                .entityId(saved.getId())
                .build();
        activityRepository.save(activity);
        
        try {
            emailService.sendWelcomeEmailAsync(saved);
        } catch (Exception e) {
            // Do not break user creation if email fails
        }
        
        return mapToResponse(saved);
    }

    @Transactional
    public AdminUserResponse updateUser(Long userId, UpdateProfileRequest request, Long adminId) {
        AdminUser user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!user.getEmail().equals(request.getEmail()) && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResourceConflictException("Email already exists");
        }
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        userRepository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Updated admin user: " + user.getEmail())
                .entityType("AdminUser")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);

        return mapToResponse(user);
    }

    public AdminUserResponse getProfile(Long adminId) {
        AdminUser user = userRepository.findById(adminId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return mapToResponse(user);
    }

    @Transactional
    public AdminUserResponse updateProfile(Long adminId, UpdateProfileRequest request) {
        AdminUser user = userRepository.findById(adminId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!user.getEmail().equals(request.getEmail()) && userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResourceConflictException("Email already exists");
        }
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        userRepository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Updated own profile")
                .entityType("AdminUser")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);

        return mapToResponse(user);
    }

    @Transactional
    public void changePassword(Long adminId, ChangePasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException("New passwords do not match");
        }
        AdminUser user = userRepository.findById(adminId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadCredentialsException("Incorrect current password");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Changed own password")
                .entityType("AdminUser")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);
    }

    @Transactional
    public void updateUserStatus(Long userId, boolean enabled, Long reassignToUserId, Long adminId) {
        if (!enabled && userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot disable yourself");
        }
        AdminUser user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        if (!enabled && user.getRole() == Role.SUPER_ADMIN) {
            long activeSuperAdmins = userRepository.countByRoleAndEnabledTrue(Role.SUPER_ADMIN);
            if (activeSuperAdmins <= 1 && user.isEnabled()) {
                throw new IllegalArgumentException("Cannot disable the last active Super Admin");
            }
        }
        
        if (!enabled && reassignToUserId != null) {
            if (reassignToUserId.equals(userId)) {
                throw new IllegalArgumentException("Cannot reassign work to the user being disabled");
            }
            AdminUser newAssignee = userRepository.findById(reassignToUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("Reassignment User not found"));
            if (!newAssignee.isEnabled()) {
                throw new IllegalArgumentException("Cannot reassign to a disabled user");
            }
            userRepository.reassignActiveEnquiries(user, newAssignee);
            userRepository.reassignActiveLeads(user, newAssignee);
            userRepository.reassignPendingFollowUps(user, newAssignee);
        }

        user.setEnabled(enabled);
        userRepository.save(user);

        String actionDesc = (enabled ? "Reactivated" : "Disabled") + " Admin User: " + user.getEmail();
        if (!enabled && reassignToUserId != null) {
            actionDesc += " and reassigned work to User ID: " + reassignToUserId;
        }
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(actionDesc)
                .entityType("AdminUser")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);
    }
    
    @Transactional
    public void updateUserRole(Long userId, String role, Long adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot change your own role");
        }
        AdminUser user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setRole(Role.valueOf(role));
        userRepository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Changed Role for Admin User: " + user.getEmail() + " to " + role)
                .entityType("AdminUser")
                .entityId(user.getId())
                .build();
        activityRepository.save(activity);
    }

    @Transactional
    public com.acrovix.admin.dto.AdminRecoveryLinkResponse sendPasswordResetLink(Long userId, Long adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot request account recovery for your own account.");
        }
        AdminUser target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!target.isEnabled()) {
            throw new IllegalStateException("Cannot send reset link to a disabled user account.");
        }

        com.acrovix.admin.dto.email.EmailDispatchResult result = authService.requestPasswordResetWithResult(target.getEmail());

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Super Admin initiated password reset email for user: " + target.getEmail() + " [Status: " + result.getStatus() + "]")
                .entityType("AdminUser")
                .entityId(target.getId())
                .build();
        activityRepository.save(activity);

        String deliveryStatus = result.getStatus() == com.acrovix.admin.dto.email.EmailDispatchResult.Status.ACCEPTED 
                ? "ACCEPTED" 
                : (result.getStatus() == com.acrovix.admin.dto.email.EmailDispatchResult.Status.UNCONFIGURED ? "NOT_CONFIGURED" : "FAILED");

        return com.acrovix.admin.dto.AdminRecoveryLinkResponse.builder()
                .status(result.getStatus().name())
                .deliveryStatus(deliveryStatus)
                .message(result.getMessage())
                .recipientEmail(target.getEmail())
                .build();
    }

    @Transactional
    public com.acrovix.admin.dto.TemporaryPasswordResetResponse resetTemporaryPassword(Long userId, Long adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot reset your own password via administrative recovery.");
        }
        AdminUser target = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!target.isEnabled()) {
            throw new IllegalStateException("Cannot generate temporary password for a disabled user account.");
        }

        String temporaryPassword = generateSecureTemporaryPassword();

        target.setPassword(passwordEncoder.encode(temporaryPassword));
        target.setMustChangePassword(true);
        userRepository.save(target);

        // Invalidate any existing reset tokens
        java.util.List<com.acrovix.admin.entity.PasswordResetToken> existingTokens = passwordResetTokenRepository.findByAdminUserAndUsedFalse(target);
        for (com.acrovix.admin.entity.PasswordResetToken token : existingTokens) {
            token.setUsed(true);
        }
        if (!existingTokens.isEmpty()) {
            passwordResetTokenRepository.saveAll(existingTokens);
        }

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action("Super Admin reset temporary password for user: " + target.getEmail())
                .entityType("AdminUser")
                .entityId(target.getId())
                .build();
        activityRepository.save(activity);

        return com.acrovix.admin.dto.TemporaryPasswordResetResponse.builder()
                .userId(target.getId())
                .userEmail(target.getEmail())
                .temporaryPassword(temporaryPassword)
                .message("Temporary password generated. It is displayed ONCE only. Share it securely with the user.")
                .build();
    }

    private String generateSecureTemporaryPassword() {
        String upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        String lower = "abcdefghijkmnopqrstuvwxyz";
        String digits = "23456789";
        String symbols = "!@#$%^&*";
        String allChars = upper + lower + digits + symbols;

        java.security.SecureRandom random = new java.security.SecureRandom();
        StringBuilder sb = new StringBuilder();

        // Ensure at least 2 chars of each character class
        for (int i = 0; i < 2; i++) {
            sb.append(upper.charAt(random.nextInt(upper.length())));
            sb.append(lower.charAt(random.nextInt(lower.length())));
            sb.append(digits.charAt(random.nextInt(digits.length())));
            sb.append(symbols.charAt(random.nextInt(symbols.length())));
        }

        // Fill remaining 8 chars to make a 16-char password
        for (int i = 0; i < 8; i++) {
            sb.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        // Shuffle characters
        char[] array = sb.toString().toCharArray();
        for (int i = array.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }

        return new String(array);
    }
}



