package com.acrovix.admin.service;

import com.acrovix.admin.dto.AdminUserRequest;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final AdminUserRepository userRepository;
    private final AdminActivityRepository activityRepository;
    private final PasswordEncoder passwordEncoder;

    public List<AdminUser> getAllUsers() {
        return userRepository.findAll().stream().peek(user -> user.setPassword(null)).collect(Collectors.toList());
    }

    @Transactional
    public AdminUser createUser(AdminUserRequest request, Long adminId) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
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
                .action("Created Admin User: " + saved.getEmail())
                .entityType("AdminUser")
                .entityId(saved.getId())
                .build();
        activityRepository.save(activity);
        
        saved.setPassword(null);
        return saved;
    }

    @Transactional
    public void updateUserStatus(Long userId, boolean enabled, Long adminId) {
        if (userId.equals(adminId)) {
            throw new RuntimeException("Cannot disable yourself");
        }
        AdminUser user = userRepository.findById(userId).orElseThrow();
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
            throw new RuntimeException("Cannot change your own role");
        }
        AdminUser user = userRepository.findById(userId).orElseThrow();
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
