package com.acrovix.admin.qa;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.demo-mode=true"
})
@Transactional
public class Phase5SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private JwtUtil jwtUtil;

    private String superAdminToken;

    @BeforeEach
    void setup() {
        AdminUser superAdmin;
        if (adminUserRepository.findByEmail("super_phase5@test.com").isEmpty()) {
            superAdmin = AdminUser.builder()
                    .email("super_phase5@test.com")
                    .password("dummy")
                    .role(Role.SUPER_ADMIN)
                    .name("Super Admin")
                    .build();
            superAdmin = adminUserRepository.save(superAdmin);
        } else {
            superAdmin = adminUserRepository.findByEmail("super_phase5@test.com").get();
        }
        
        superAdminToken = jwtUtil.generateToken(superAdmin);
    }

    @Test
    void testCorsAndSecurityHeadersOnOptions() throws Exception {
        mockMvc.perform(options("/api/admin/profile")
                .header("Origin", "http://localhost:5173")
                .header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Access-Control-Allow-Origin"))
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                // Security headers should be present even on OPTIONS preflight
                .andExpect(header().exists("X-Content-Type-Options"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void testSecurityHeadersOnAuthenticatedApi() throws Exception {
        mockMvc.perform(get("/api/admin/profile")
                .header("Authorization", "Bearer " + superAdminToken)
                // Simulate production https to trigger HSTS
                .secure(true)) 
                .andExpect(status().isOk())
                .andExpect(header().exists("X-Frame-Options"))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'"))
                .andExpect(header().exists("Permissions-Policy"))
                .andExpect(header().string("Permissions-Policy", "geolocation=(), camera=(), microphone=(), payment=()"))
                .andExpect(header().exists("Referrer-Policy"))
                .andExpect(header().string("Referrer-Policy", "strict-origin-when-cross-origin"))
                .andExpect(header().exists("Strict-Transport-Security"))
                // Ensure Cache-Control has no-store for sensitive APIs
                .andExpect(header().exists("Cache-Control"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    void testSecurityHeadersOnPdf() throws Exception {
        // Even if 4xx, security headers should be present on PDF endpoints
        mockMvc.perform(get("/api/admin/invoices/999/pdf")
                .header("Authorization", "Bearer " + superAdminToken)
                .secure(true))
                .andExpect(status().is4xxClientError())
                .andExpect(header().exists("X-Frame-Options"))
                .andExpect(header().exists("Content-Security-Policy"))
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")));
    }

    @Test
    void testSecurityHeadersOn401Unauthorized() throws Exception {
        mockMvc.perform(get("/api/admin/profile"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists("X-Content-Type-Options"))
                .andExpect(header().exists("X-Frame-Options"));
    }
}
