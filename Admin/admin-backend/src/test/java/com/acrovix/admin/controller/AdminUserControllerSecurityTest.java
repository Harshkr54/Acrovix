package com.acrovix.admin.controller;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AdminUserControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private AdminUser testSuperAdmin;
    private AdminUser testSalesUser;
    private AdminUser testDisabledUser;

    private String superAdminToken;
    private String salesToken;
    private String disabledToken;

    @BeforeEach
    void setUp() {
        long ts = System.currentTimeMillis();

        testSuperAdmin = AdminUser.builder()
                .name("Test Super Admin")
                .email("test-sa-" + ts + "@acrovix.com")
                .password(passwordEncoder.encode("Secret123!"))
                .role(Role.SUPER_ADMIN)
                .enabled(true)
                .build();
        testSuperAdmin = adminUserRepository.save(testSuperAdmin);

        testSalesUser = AdminUser.builder()
                .name("Test Sales User")
                .email("test-sales-" + ts + "@acrovix.com")
                .password(passwordEncoder.encode("Secret123!"))
                .role(Role.SALES)
                .enabled(true)
                .build();
        testSalesUser = adminUserRepository.save(testSalesUser);

        testDisabledUser = AdminUser.builder()
                .name("Test Disabled Rep")
                .email("test-disabled-" + ts + "@acrovix.com")
                .password(passwordEncoder.encode("Secret123!"))
                .role(Role.SALES)
                .enabled(false)
                .build();
        testDisabledUser = adminUserRepository.save(testDisabledUser);

        superAdminToken = jwtUtil.generateToken(testSuperAdmin);
        salesToken = jwtUtil.generateToken(testSalesUser);
        disabledToken = jwtUtil.generateToken(testDisabledUser);
    }

    @AfterEach
    void tearDown() {
        if (testDisabledUser != null && testDisabledUser.getId() != null) {
            adminUserRepository.deleteById(testDisabledUser.getId());
        }
        if (testSalesUser != null && testSalesUser.getId() != null) {
            adminUserRepository.deleteById(testSalesUser.getId());
        }
        if (testSuperAdmin != null && testSuperAdmin.getId() != null) {
            adminUserRepository.deleteById(testSuperAdmin.getId());
        }
    }

    @Test
    void testSalesRole_ForbiddenFromUserManagement() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + salesToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/admin/users/" + testSalesUser.getId() + "/status")
                .header("Authorization", "Bearer " + salesToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("enabled", false))))
                .andExpect(status().isForbidden());
    }

    @Test
    void testDisabledUser_TokenRejected() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + disabledToken))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testSuperAdmin_CanListAllUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(3)));
    }

    @Test
    void testSuperAdmin_CanFilterActiveUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .param("enabled", "true")
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(2)));
    }

    @Test
    void testSuperAdmin_CanFilterInactiveUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .param("enabled", "false")
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThanOrEqualTo(1)));
    }

    @Test
    void testSuperAdmin_GetUserById() throws Exception {
        mockMvc.perform(get("/api/admin/users/" + testSalesUser.getId())
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testSalesUser.getId()))
                .andExpect(jsonPath("$.email").value(testSalesUser.getEmail()));
    }
}
