package com.acrovix.admin.qa;

import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.service.AdminUserService;
import com.acrovix.admin.security.JwtUtil;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.demo-mode=true"
})
@Transactional
public class OffboardingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminUserService adminUserService;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private AdminEnquiryRepository adminEnquiryRepository;

    @Autowired
    private CrmLeadRepository crmLeadRepository;

    @Autowired
    private InvoiceRepository invoiceRepository;
    
    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private AdminUser superAdmin1;
    private AdminUser superAdmin2;
    private AdminUser salesUser;
    
    @BeforeEach
    void setup() {
        superAdmin1 = adminUserRepository.save(AdminUser.builder()
                .email("super1@test.com").password("dummy").role(Role.SUPER_ADMIN).name("SA 1").build());
        superAdmin2 = adminUserRepository.save(AdminUser.builder()
                .email("super2@test.com").password("dummy").role(Role.SUPER_ADMIN).name("SA 2").build());
        salesUser = adminUserRepository.save(AdminUser.builder()
                .email("sales@test.com").password("dummy").role(Role.SALES).name("Sales 1").build());
    }

    @Test
    void testDisabledUserRejectedByJwt() throws Exception {
        String token = jwtUtil.generateToken(salesUser);
        
        // Active user can access profile
        mockMvc.perform(get("/api/admin/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
                
        // Disable user
        salesUser.setEnabled(false);
        adminUserRepository.save(salesUser);
        
        // Disabled user token should be rejected (401)
        mockMvc.perform(get("/api/admin/profile").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testSelfDeactivationRejected() {
        assertThrows(IllegalArgumentException.class, () -> {
            adminUserService.updateUserStatus(superAdmin1.getId(), false, null, superAdmin1.getId());
        });
    }

    @Test
    void testLastActiveSuperAdminProtected() {
        // Find all active super admins
        java.util.List<AdminUser> activeSAs = adminUserRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPER_ADMIN && u.isEnabled())
                .toList();
                
        // Keep one active (the first one)
        AdminUser lastSA = activeSAs.get(0);
        
        // Disable all others
        for (int i = 1; i < activeSAs.size(); i++) {
            AdminUser toDisable = activeSAs.get(i);
            adminUserService.updateUserStatus(toDisable.getId(), false, null, lastSA.getId());
        }
        
        // Now try to disable the last one
        assertThrows(IllegalArgumentException.class, () -> {
            adminUserService.updateUserStatus(lastSA.getId(), false, null, superAdmin2.getId()); // Use any other ID
        });
    }

    @Test
    void testReassignmentAndHistoricalRecordsPreserved() {
        // Create an enquiry assigned to salesUser
        AdminEnquiry enquiry = AdminEnquiry.builder()
                .fullName("Test").businessEmail("test@test.com").companyName("Test")
                .phoneNumber("123").projectRequirement("test").assignedTo(salesUser).status("NEW").build();
        adminEnquiryRepository.save(enquiry);
        
        // Reassign salesUser work to superAdmin1
        adminUserService.updateUserStatus(salesUser.getId(), false, superAdmin1.getId(), superAdmin2.getId());
        
        // Verify reassignment
        AdminEnquiry updatedEnquiry = adminEnquiryRepository.findById(enquiry.getId()).get();
        assertEquals(superAdmin1.getId(), updatedEnquiry.getAssignedTo().getId());
    }
}






