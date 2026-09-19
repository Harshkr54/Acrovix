package com.acrovix.admin.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Arrays;

@Component
public class ConfigValidator {

    private static final Logger logger = LoggerFactory.getLogger(ConfigValidator.class);

    private final Environment environment;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${spring.datasource.url:}")
    private String dbUrl;

    @Value("${spring.datasource.username:}")
    private String dbUsername;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    @Value("${admin.initial.password:}")
    private String adminPassword;

    public ConfigValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validateProductionConfig() {
        boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");

        if (isProd) {
            logger.info("Validating PRODUCTION configuration secrets...");

            // 1. JWT Secret Validation
            if (!StringUtils.hasText(jwtSecret)) {
                throw new IllegalStateException("Required production configuration JWT_SECRET is missing.");
            }
            if (jwtSecret.length() < 32) {
                throw new IllegalStateException("Required production configuration JWT_SECRET is too weak (must be at least 32 characters/256 bits).");
            }

            // 2. Database Validation
            if (!StringUtils.hasText(dbUrl) || !StringUtils.hasText(dbUsername) || !StringUtils.hasText(dbPassword)) {
                throw new IllegalStateException("Required production configuration for Database (DB_URL, DB_USERNAME, DB_PASSWORD) is missing.");
            }

            // 3. Admin Bootstrap Validation
            if (!StringUtils.hasText(adminPassword)) {
                throw new IllegalStateException("Required production configuration INITIAL_ADMIN_PASSWORD is missing.");
            }

            logger.info("PRODUCTION configuration secrets validated successfully.");
        } else {
            logger.info("Skipping strict production configuration validation (not in 'prod' profile).");
        }
    }
}
