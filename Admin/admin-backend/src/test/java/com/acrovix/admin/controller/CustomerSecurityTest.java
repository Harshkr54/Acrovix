package com.acrovix.admin.controller;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Customer;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.repository.CustomerRepository;
import com.acrovix.admin.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class CustomerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private Customer testCustomer;
    private String superAdminToken;
    private String salesToken;

    @BeforeEach
    void setUp() {
        long ts = System.currentTimeMillis();

        AdminUser superAdmin = AdminUser.builder()
                .name("Super Admin")
                .email("custsec-sa-" + ts + "@acrovix.test")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.SUPER_ADMIN)
                .enabled(true)
                .build();
        superAdmin = adminUserRepository.save(superAdmin);
        superAdminToken = jwtUtil.generateToken(superAdmin);

        AdminUser salesUser = AdminUser.builder()
                .name("Sales User")
                .email("custsec-sales-" + ts + "@acrovix.test")
                .password(passwordEncoder.encode("Password123!"))
                .role(Role.SALES)
                .enabled(true)
                .build();
        salesUser = adminUserRepository.save(salesUser);
        salesToken = jwtUtil.generateToken(salesUser);

        testCustomer = Customer.builder()
                .customerCode("C-SEC-" + ts)
                .name("Security Customer")
                .companyName("Security Corp")
                .email("sec-" + ts + "@test.com")
                .active(true)
                .createdBy(salesUser.getId())
                .build();
        testCustomer = customerRepository.save(testCustomer);
    }

    @Test
    void testSalesCannotDeleteCustomer_ReturnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/admin/customers/" + testCustomer.getId())
                .header("Authorization", "Bearer " + salesToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testSuperAdminCanDeleteCustomer_ReturnsOk() throws Exception {
        mockMvc.perform(delete("/api/admin/customers/" + testCustomer.getId())
                .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk());
    }

    @Test
    void testSalesCannotActivateCustomer_ReturnsForbidden() throws Exception {
        mockMvc.perform(patch("/api/admin/customers/" + testCustomer.getId() + "/activate")
                .header("Authorization", "Bearer " + salesToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void testSalesCannotBulkUpdateStatus_ReturnsForbidden() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/customers/bulk-status")
                .header("Authorization", "Bearer " + salesToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerIds\": [" + testCustomer.getId() + "], \"active\": false}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void testSuperAdminCanBulkUpdateStatus_ReturnsOk() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/admin/customers/bulk-status")
                .header("Authorization", "Bearer " + superAdminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"customerIds\": [" + testCustomer.getId() + "], \"active\": false}"))
                .andExpect(status().isOk());
    }
}
