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

    private AdminUserResponse mapToResponse(AdminUser user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .build();
    }

    public List<AdminUserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(this::mapToResponse).collect(Collectors.toList());
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
    public void updateUserStatus(Long userId, boolean enabled, Long adminId) {
        if (userId.equals(adminId)) {
            throw new IllegalArgumentException("Cannot disable yourself");
        }
        AdminUser user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setEnabled(enabled);
        userRepository.save(user);

        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action((enabled ? "Enabled" : "Disabled") + " Admin User: " + user.getEmail())
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
}
