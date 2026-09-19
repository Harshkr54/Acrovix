package com.acrovix.admin.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

public class ChangePasswordRequestTest {

    private Validator validator;

    @BeforeEach
    public void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    public void testPasswordLessThan8CharsIsRejected() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpass123");
        request.setNewPassword("short");
        request.setConfirmPassword("short");

        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream().anyMatch(v -> v.getMessage().contains("Password must be at least 8 characters")));
    }

    @Test
    public void testPassword8CharsIsAccepted() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpass123");
        request.setNewPassword("goodpass123");
        request.setConfirmPassword("goodpass123");

        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    public void testBlankPasswordIsRejected() {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("oldpass123");
        request.setNewPassword("");
        request.setConfirmPassword("");

        Set<ConstraintViolation<ChangePasswordRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }
}
