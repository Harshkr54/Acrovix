package com.acrovix.admin.controller;

import com.acrovix.admin.dto.AuthRequest;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.service.LoginRateLimiterService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
public class AuthSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private AdminActivityRepository activityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        adminUserRepository.deleteAll();
        activityRepository.deleteAll();

        AdminUser user = new AdminUser();
        user.setEmail("test@example.com");
        user.setPassword(passwordEncoder.encode("password123"));
        user.setName("Test User");
        user.setRole(Role.SUPER_ADMIN);
        user.setEnabled(true);
        adminUserRepository.save(user);

        // Reset rate limiter for the test IP
        rateLimiterService.loginSucceeded("127.0.0.1");
    }

    @Test
    void testValidLoginSucceeds() throws Exception {
        AuthRequest request = new AuthRequest("test@example.com", "password123");

        mockMvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isOk());
    }

    @Test
    void testInvalidPasswordFails() throws Exception {
        AuthRequest request = new AuthRequest("test@example.com", "wrongpassword");

        mockMvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testInvalidLoginIsLogged() throws Exception {
        AuthRequest request = new AuthRequest("test@example.com", "wrongpassword");

        mockMvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isUnauthorized());

        boolean hasFailedLog = activityRepository.findAll().stream()
                .anyMatch(a -> "LOGIN_FAILED".equals(a.getAction()));
        assertTrue(hasFailedLog, "Failed login should be logged in AdminActivity");
    }

    @Test
    void testRateLimiting() throws Exception {
        AuthRequest request = new AuthRequest("test@example.com", "wrongpassword");

        // Fail 5 times
        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/admin/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(request))
                    .header("X-Forwarded-For", "127.0.0.1"))
                    .andExpect(status().isUnauthorized());
        }

        // 6th time should be rate limited
        mockMvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
                .header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isTooManyRequests());

        boolean hasRateLimitLog = activityRepository.findAll().stream()
                .anyMatch(a -> "LOGIN_RATE_LIMITED".equals(a.getAction()));
        assertTrue(hasRateLimitLog, "Rate limited attempt should be logged");
    }
}
