package com.acrovix.admin.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

public class LoginRateLimiterServiceTest {

    private LoginRateLimiterService rateLimiterService;

    @BeforeEach
    void setUp() {
        rateLimiterService = new LoginRateLimiterService();
    }

    @Test
    void testValidLoginDoesNotRateLimit() {
        assertFalse(rateLimiterService.isRateLimited("127.0.0.1"));
    }

    @Test
    void testMultipleFailedLoginsTriggerRateLimit() {
        for (int i = 0; i < 5; i++) {
            assertFalse(rateLimiterService.isRateLimited("127.0.0.1"));
            rateLimiterService.loginFailed("127.0.0.1");
        }
        assertTrue(rateLimiterService.isRateLimited("127.0.0.1"));
    }

    @Test
    void testSuccessfulLoginResetsFailureCount() {
        rateLimiterService.loginFailed("127.0.0.1");
        rateLimiterService.loginFailed("127.0.0.1");
        
        rateLimiterService.loginSucceeded("127.0.0.1");
        
        for (int i = 0; i < 4; i++) {
            rateLimiterService.loginFailed("127.0.0.1");
        }
        assertFalse(rateLimiterService.isRateLimited("127.0.0.1"));
    }
}
