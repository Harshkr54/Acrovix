package com.acrovix.admin.qa;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.demo-mode=true",
    "acrovix.security.rate-limit.enabled=true",
    "acrovix.security.rate-limit.public.requests-per-minute=1",
    "acrovix.security.rate-limit.email.requests-per-minute=1",
    "acrovix.security.rate-limit.ai.requests-per-minute=1",
    "acrovix.security.rate-limit.pdf.requests-per-minute=1",
    "acrovix.security.rate-limit.export.requests-per-minute=1",
    "acrovix.security.pagination.max-size=100",
    "acrovix.security.search.max-length=200"
})
@Transactional
public class Phase4SecurityIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;
    
    private String superAdminToken;

    @BeforeEach
    void setup() {
        AdminUser superAdmin;
        if (adminUserRepository.findByEmail("super_phase4@test.com").isEmpty()) {
            superAdmin = AdminUser.builder()
                    .email("super_phase4@test.com")
                    .password("dummy")
                    .role(Role.SUPER_ADMIN)
                    .name("Super Admin")
                    .build();
            superAdmin = adminUserRepository.save(superAdmin);
        } else {
            superAdmin = adminUserRepository.findByEmail("super_phase4@test.com").get();
        }
        
        superAdminToken = jwtUtil.generateToken(superAdmin);
    }

    @Test
    void testPublicQuotationRateLimit() throws Exception {
        // First request is allowed (or might fail with 404/500, but not 429)
        mockMvc.perform(get("/api/public/quotations/dummy-token")
                .header("X-Forwarded-For", "192.168.1.1"));

        // Second request from same IP should be 429 because limit is 1
        mockMvc.perform(get("/api/public/quotations/dummy-token")
                .header("X-Forwarded-For", "192.168.1.1"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void testEmailRateLimit() throws Exception {
        Map<String, String> body = Map.of("recipientEmail", "test@test.com");
        
        mockMvc.perform(post("/api/admin/quotations/999/send-email")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isNotFound()); // Quote 999 not found

        mockMvc.perform(post("/api/admin/quotations/999/send-email")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void testAiRateLimit() throws Exception {
        Map<String, String> body = Map.of("roughText", "test");
        
        mockMvc.perform(post("/api/admin/gemini/extract")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body))); // Gemini might return OK or 500 depending on mock, but not 429

        mockMvc.perform(post("/api/admin/gemini/extract")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    void testPdfRateLimit() throws Exception {
        mockMvc.perform(get("/api/admin/quotations/999/pdf")
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/admin/quotations/999/pdf")
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isTooManyRequests());
    }
}
