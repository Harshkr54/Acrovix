package com.acrovix.admin.config;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AdminInitialSetup implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminInitialSetup.class);

    private final AdminUserRepository adminUserRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.initial.name}")
    private String initialName;

    @Value("${admin.initial.email}")
    private String initialEmail;

    @Value("${admin.initial.password}")
    private String initialPassword;

    @Override
    public void run(String... args) {
        if (!adminUserRepository.existsByEmail(initialEmail)) {
            logger.info("No SUPER_ADMIN found with email {}. Creating default SUPER_ADMIN...", initialEmail);
            AdminUser admin = AdminUser.builder()
                    .name(initialName)
                    .email(initialEmail)
                    .password(passwordEncoder.encode(initialPassword))
                    .role(Role.SUPER_ADMIN)
                    .enabled(true)
                    .build();
            adminUserRepository.save(admin);
            logger.info("SUPER_ADMIN created successfully.");
        } else {
            logger.info("SUPER_ADMIN already exists. Skipping initialization.");
        }
    }
}
