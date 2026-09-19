package com.acrovix.admin.qa;

import com.acrovix.admin.config.ConfigValidator;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.springframework.test.util.ReflectionTestUtils;

public class Phase6SecurityIntegrationTest {

    @Test
    void testConfigValidatorFailsFastInProdWhenSecretsMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ConfigValidator validator = new ConfigValidator(env);

        // Missing all secrets
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionConfig);
        assertTrue(ex.getMessage().contains("JWT_SECRET is missing"));
    }

    @Test
    void testConfigValidatorFailsFastInProdWhenJwtSecretTooShort() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ConfigValidator validator = new ConfigValidator(env);

        ReflectionTestUtils.setField(validator, "jwtSecret", "short");
        
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionConfig);
        assertTrue(ex.getMessage().contains("JWT_SECRET is too weak"));
    }

    @Test
    void testConfigValidatorFailsFastInProdWhenDatabaseMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ConfigValidator validator = new ConfigValidator(env);

        ReflectionTestUtils.setField(validator, "jwtSecret", "12345678901234567890123456789012"); // 32 chars
        // dbUrl is null
        
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionConfig);
        assertTrue(ex.getMessage().contains("Database"));
    }

    @Test
    void testConfigValidatorFailsFastInProdWhenAdminPasswordMissing() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ConfigValidator validator = new ConfigValidator(env);

        ReflectionTestUtils.setField(validator, "jwtSecret", "12345678901234567890123456789012");
        ReflectionTestUtils.setField(validator, "dbUrl", "jdbc:postgresql://localhost/db");
        ReflectionTestUtils.setField(validator, "dbUsername", "user");
        ReflectionTestUtils.setField(validator, "dbPassword", "pass");
        // adminPassword is null
        
        IllegalStateException ex = assertThrows(IllegalStateException.class, validator::validateProductionConfig);
        assertTrue(ex.getMessage().contains("INITIAL_ADMIN_PASSWORD"));
    }

    @Test
    void testConfigValidatorPassesInProdWhenAllSecretsPresent() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("prod");
        ConfigValidator validator = new ConfigValidator(env);

        ReflectionTestUtils.setField(validator, "jwtSecret", "12345678901234567890123456789012");
        ReflectionTestUtils.setField(validator, "dbUrl", "jdbc:postgresql://localhost/db");
        ReflectionTestUtils.setField(validator, "dbUsername", "user");
        ReflectionTestUtils.setField(validator, "dbPassword", "pass");
        ReflectionTestUtils.setField(validator, "adminPassword", "securePassword123!");
        
        assertDoesNotThrow(validator::validateProductionConfig);
    }

    @Test
    void testConfigValidatorSkipsValidationInDev() {
        MockEnvironment env = new MockEnvironment();
        env.setActiveProfiles("dev"); // Not prod
        ConfigValidator validator = new ConfigValidator(env);

        // Missing all secrets, but should NOT throw because it's not prod
        assertDoesNotThrow(validator::validateProductionConfig);
    }
}
