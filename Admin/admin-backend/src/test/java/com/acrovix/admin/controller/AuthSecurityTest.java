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
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.acrovix.admin.dto.ForgotPasswordRequest;
import com.acrovix.admin.dto.ResetPasswordRequest;
import com.acrovix.admin.entity.PasswordResetToken;
import com.acrovix.admin.repository.PasswordResetTokenRepository;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;

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
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LoginRateLimiterService rateLimiterService;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        passwordResetTokenRepository.deleteAll();
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

    @Test
    void testForgotPasswordUnknownEmailDoesNotLeakOrGenerateToken() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("unknown-user@example.com");

        mockMvc.perform(post("/api/admin/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        assertEquals(0, passwordResetTokenRepository.count(),
                "Unknown email must not generate any password reset token in the database");
    }

    @Test
    void testForgotPasswordInvalidEmailFormatFails() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("not-a-valid-email");

        mockMvc.perform(post("/api/admin/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testForgotPasswordRegisteredEmailGeneratesHashedToken() throws Exception {
        ForgotPasswordRequest request = new ForgotPasswordRequest();
        request.setEmail("test@example.com");

        mockMvc.perform(post("/api/admin/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        assertEquals(1, passwordResetTokenRepository.count(),
                "Registered email must create exactly one password reset token");
        PasswordResetToken token = passwordResetTokenRepository.findAll().get(0);
        assertFalse(token.isUsed());
        assertEquals("test@example.com", token.getAdminUser().getEmail());
        assertTrue(token.getExpiryDate().isAfter(LocalDateTime.now()),
                "Token expiry must be set in the future");
    }

    @Test
    void testResetPasswordValidationAndFlow() throws Exception {
        AdminUser user = adminUserRepository.findByEmail("test@example.com").orElseThrow();

        // Prepare a known token
        String rawToken = "safe-test-token-value-1234567890";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String tokenHash = HexFormat.of().formatHex(md.digest(rawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .tokenHash(tokenHash)
                .adminUser(user)
                .expiryDate(LocalDateTime.now().plusMinutes(15))
                .used(false)
                .build();
        passwordResetTokenRepository.save(resetToken);

        // 1. Password mismatch fails
        ResetPasswordRequest mismatchReq = new ResetPasswordRequest();
        mismatchReq.setToken(rawToken);
        mismatchReq.setNewPassword("NewPassword123!");
        mismatchReq.setConfirmPassword("DifferentPassword123!");

        mockMvc.perform(post("/api/admin/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mismatchReq)))
                .andExpect(status().isBadRequest());

        // 2. Invalid token fails
        ResetPasswordRequest invalidTokenReq = new ResetPasswordRequest();
        invalidTokenReq.setToken("invalid-nonexistent-token");
        invalidTokenReq.setNewPassword("NewPassword123!");
        invalidTokenReq.setConfirmPassword("NewPassword123!");

        mockMvc.perform(post("/api/admin/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidTokenReq)))
                .andExpect(status().isBadRequest());

        // 3. Valid token resets password
        ResetPasswordRequest validReq = new ResetPasswordRequest();
        validReq.setToken(rawToken);
        validReq.setNewPassword("NewPassword123!");
        validReq.setConfirmPassword("NewPassword123!");

        mockMvc.perform(post("/api/admin/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isOk());

        // Verify token is now marked used
        PasswordResetToken updatedToken = passwordResetTokenRepository.findByTokenHash(tokenHash).orElseThrow();
        assertTrue(updatedToken.isUsed(), "Token must be invalidated after use");

        // 4. Token cannot be reused
        mockMvc.perform(post("/api/admin/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isBadRequest());

        // 5. Old password no longer works
        AuthRequest oldLogin = new AuthRequest("test@example.com", "password123");
        mockMvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(oldLogin))
                .header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isUnauthorized());

        // 6. New password works
        AuthRequest newLogin = new AuthRequest("test@example.com", "NewPassword123!");
        mockMvc.perform(post("/api/admin/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(newLogin))
                .header("X-Forwarded-For", "127.0.0.1"))
                .andExpect(status().isOk());
    }

    @Test
    void testResetPasswordExpiredTokenFails() throws Exception {
        AdminUser user = adminUserRepository.findByEmail("test@example.com").orElseThrow();

        String rawToken = "expired-token-value-12345";
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String tokenHash = HexFormat.of().formatHex(md.digest(rawToken.getBytes(StandardCharsets.UTF_8)));

        PasswordResetToken expiredToken = PasswordResetToken.builder()
                .tokenHash(tokenHash)
                .adminUser(user)
                .expiryDate(LocalDateTime.now().minusMinutes(5)) // Expired 5 mins ago
                .used(false)
                .build();
        passwordResetTokenRepository.save(expiredToken);

        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setToken(rawToken);
        req.setNewPassword("NewPassword123!");
        req.setConfirmPassword("NewPassword123!");

        mockMvc.perform(post("/api/admin/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testResetLinkGenerationUsesConfiguredFrontendUrl() throws Exception {
        // Mock emailService to capture the generated reset link
        com.acrovix.admin.service.EmailService mockEmailService = org.mockito.Mockito.mock(com.acrovix.admin.service.EmailService.class);
        
        com.acrovix.admin.service.AuthService customAuthService = new com.acrovix.admin.service.AuthService(
                adminUserRepository,
                activityRepository,
                null,
                null,
                mockEmailService,
                rateLimiterService,
                null,
                passwordResetTokenRepository,
                passwordEncoder
        );

        // Inject production frontend URL via reflection
        java.lang.reflect.Field urlField = com.acrovix.admin.service.AuthService.class.getDeclaredField("frontendUrl");
        urlField.setAccessible(true);
        urlField.set(customAuthService, "https://admin.acrovix.com");

        customAuthService.requestPasswordReset("test@example.com");

        org.mockito.ArgumentCaptor<String> linkCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(mockEmailService).sendPasswordResetEmailAsync(
                org.mockito.ArgumentMatchers.eq("test@example.com"),
                linkCaptor.capture()
        );

        String generatedLink = linkCaptor.getValue();
        assertTrue(generatedLink.startsWith("https://admin.acrovix.com/reset-password?token="),
                "Production reset link must start with https://admin.acrovix.com/reset-password?token=");
        assertFalse(generatedLink.contains("localhost"),
                "Production reset link must never contain localhost");
    }
}
