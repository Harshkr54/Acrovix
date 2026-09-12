package com.acrovix.admin.service;

import com.acrovix.admin.dto.AuthRequest;
import com.acrovix.admin.dto.AuthResponse;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.repository.AdminActivityRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
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
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );
        var user = repository.findByEmail(request.getEmail())
                .orElseThrow();
        
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
