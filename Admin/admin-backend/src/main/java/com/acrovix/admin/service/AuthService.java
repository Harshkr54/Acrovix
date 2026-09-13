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

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AdminUserRepository repository;
    private final AdminActivityRepository activityRepository;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse authenticate(AuthRequest request) {
        // authenticate() internally calls UserDetailsService.loadUserByUsername() — one DB query.
        // Extracting the principal avoids a second redundant findByEmail() call.
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        AdminUser user = (AdminUser) authentication.getPrincipal();

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
        return AuthResponse.builder()
                .token(jwtToken)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }
}
