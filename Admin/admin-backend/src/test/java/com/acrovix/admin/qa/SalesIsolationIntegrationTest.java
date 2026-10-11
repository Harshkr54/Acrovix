package com.acrovix.admin.qa;

import com.acrovix.admin.dto.CustomerRequest;
import com.acrovix.admin.entity.*;
import com.acrovix.admin.repository.*;
import com.acrovix.admin.security.JwtUtil;
import com.acrovix.admin.service.DashboardService;
import com.acrovix.admin.service.CrmService;
import com.acrovix.admin.dto.CustomerResponse;
import com.acrovix.admin.dto.crm.CrmDashboardSummaryResponse;
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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
    "app.demo-mode=true"
})
@Transactional
public class SalesIsolationIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AdminUserRepository adminUserRepository;

    @Autowired
    private CrmLeadRepository crmLeadRepository;

    @Autowired
    private AdminEnquiryRepository adminEnquiryRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private QuotationRepository quotationRepository;

    @Autowired
    private DashboardService dashboardService;

    @Autowired
    private CrmService crmService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private AdminUser superAdmin;
    private AdminUser salesA;
    private AdminUser salesB;

    @BeforeEach
    void setup() {
        superAdmin = adminUserRepository.save(AdminUser.builder()
                .email("superadmin_iso_test@test.com").password("dummy").role(Role.SUPER_ADMIN).name("Super Admin").build());
        salesA = adminUserRepository.save(AdminUser.builder()
                .email("sales_a_iso_test@test.com").password("dummy").role(Role.SALES).name("Sales A").build());
        salesB = adminUserRepository.save(AdminUser.builder()
                .email("sales_b_iso_test@test.com").password("dummy").role(Role.SALES).name("Sales B").build());
    }

    @Test
    void testCrmDashboardMetricsIsolation() {
        // Create lead for Sales A
        crmLeadRepository.save(CrmLead.builder()
                .leadNumber("LEAD-A")
                .fullName("Client A")
                .businessEmail("clienta@test.com")
                .status(LeadStatus.NEW)
                .estimatedValue(BigDecimal.valueOf(1000))
                .assignedTo(salesA)
                .build());

        // Create lead for Sales B
        crmLeadRepository.save(CrmLead.builder()
                .leadNumber("LEAD-B")
                .fullName("Client B")
                .businessEmail("clientb@test.com")
                .status(LeadStatus.NEW)
                .estimatedValue(BigDecimal.valueOf(2000))
                .assignedTo(salesB)
                .build());

        // Verify Sales A sees only their lead
        CrmDashboardSummaryResponse summaryA = crmService.getDashboardSummary(salesA);
        assertEquals(1, summaryA.getNewLeads());
        assertEquals(0, BigDecimal.valueOf(1000).compareTo(summaryA.getOpenPipelineValue()));

        // Verify Sales B sees only their lead
        CrmDashboardSummaryResponse summaryB = crmService.getDashboardSummary(salesB);
        assertEquals(1, summaryB.getNewLeads());
        assertEquals(0, BigDecimal.valueOf(2000).compareTo(summaryB.getOpenPipelineValue()));

        // Verify Super Admin sees both leads
        CrmDashboardSummaryResponse summarySA = crmService.getDashboardSummary(superAdmin);
        assertTrue(summarySA.getNewLeads() >= 2);
    }

    @Test
    void testDashboardMetricsIsolation() {
        // Create enquiry for Sales A
        adminEnquiryRepository.save(AdminEnquiry.builder()
                .fullName("Enquiry A").businessEmail("ea@test.com").companyName("Comp A")
                .phoneNumber("123").projectRequirement("req A").assignedTo(salesA).status("NEW").build());

        // Create enquiry for Sales B
        adminEnquiryRepository.save(AdminEnquiry.builder()
                .fullName("Enquiry B").businessEmail("eb@test.com").companyName("Comp B")
                .phoneNumber("456").projectRequirement("req B").assignedTo(salesB).status("NEW").build());

        // Sales A stats
        Map<String, Object> statsA = dashboardService.getDashboardStats("ALL_TIME", "ALL", "ALL", null, null, salesA);
        assertEquals(1L, ((Number) statsA.get("totalEnquiries")).longValue());

        // Sales B stats
        Map<String, Object> statsB = dashboardService.getDashboardStats("ALL_TIME", "ALL", "ALL", null, null, salesB);
        assertEquals(1L, ((Number) statsB.get("totalEnquiries")).longValue());

        // Super Admin stats
        Map<String, Object> statsSA = dashboardService.getDashboardStats("ALL_TIME", "ALL", "ALL", null, null, superAdmin);
        assertTrue(((Number) statsSA.get("totalEnquiries")).longValue() >= 2L);
    }

    @Test
    void testCustomerListAndMutationIsolation() throws Exception {
        Customer custA = customerRepository.save(Customer.builder()
                .customerCode("CUST-A").name("Customer A").createdBy(superAdmin.getId()).active(true).build());
        Customer custB = customerRepository.save(Customer.builder()
                .customerCode("CUST-B").name("Customer B").createdBy(superAdmin.getId()).active(true).build());

        // Link custA to Sales A via CRM Lead
        crmLeadRepository.save(CrmLead.builder()
                .leadNumber("LEAD-CA")
                .fullName("Customer A")
                .businessEmail("ca@test.com")
                .status(LeadStatus.NEW)
                .customer(custA)
                .assignedTo(salesA)
                .build());

        // Link custB to Sales B via CRM Lead
        crmLeadRepository.save(CrmLead.builder()
                .leadNumber("LEAD-CB")
                .fullName("Customer B")
                .businessEmail("cb@test.com")
                .status(LeadStatus.NEW)
                .customer(custB)
                .assignedTo(salesB)
                .build());

        String tokenA = jwtUtil.generateToken(salesA);
        String tokenSA = jwtUtil.generateToken(superAdmin);
        
        // Sales A can see Customer A
        mockMvc.perform(get("/api/admin/customers/" + custA.getId()).header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());

        // Sales A cannot see Customer B (403 Forbidden)
        mockMvc.perform(get("/api/admin/customers/" + custB.getId()).header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());

        // Sales A cannot update Customer B (403 Forbidden)
        CustomerRequest updateB = new CustomerRequest();
        updateB.setCustomerCode("CUST-B");
        updateB.setName("Customer B Mutated");
        mockMvc.perform(patch("/api/admin/customers/" + custB.getId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateB)))
                .andExpect(status().isForbidden());

        // Sales A cannot delete Customer B (403 Forbidden)
        mockMvc.perform(delete("/api/admin/customers/" + custB.getId())
                .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isForbidden());

        // Sales A CAN update Customer A (200 OK)
        CustomerRequest updateA = new CustomerRequest();
        updateA.setCustomerCode("CUST-A");
        updateA.setName("Customer A Updated");
        mockMvc.perform(patch("/api/admin/customers/" + custA.getId())
                .header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateA)))
                .andExpect(status().isOk());

        // Super Admin CAN update Customer B (200 OK)
        mockMvc.perform(patch("/api/admin/customers/" + custB.getId())
                .header("Authorization", "Bearer " + tokenSA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateB)))
                .andExpect(status().isOk());
    }

    @Test
    void testDirectQuotationListIsolation() throws Exception {
        // Direct quotation created by Sales A (no enquiry)
        Quotation qA = quotationRepository.save(Quotation.builder()
                .quotationNumber("QT-DIRECT-A")
                .clientName("Direct Client A")
                .clientEmail("directa@test.com")
                .quotationSource(QuotationSource.PHONE)
                .status("DRAFT")
                .subtotal(BigDecimal.valueOf(5000))
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.valueOf(5000))
                .createdBy(salesA)
                .validUntil(LocalDate.now().plusDays(30))
                .build());

        // Direct quotation created by Sales B (no enquiry)
        Quotation qB = quotationRepository.save(Quotation.builder()
                .quotationNumber("QT-DIRECT-B")
                .clientName("Direct Client B")
                .clientEmail("directb@test.com")
                .quotationSource(QuotationSource.PHONE)
                .status("DRAFT")
                .subtotal(BigDecimal.valueOf(8000))
                .discountAmount(BigDecimal.ZERO)
                .taxAmount(BigDecimal.ZERO)
                .grandTotal(BigDecimal.valueOf(8000))
                .createdBy(salesB)
                .validUntil(LocalDate.now().plusDays(30))
                .build());

        String tokenA = jwtUtil.generateToken(salesA);
        String tokenB = jwtUtil.generateToken(salesB);
        String tokenSA = jwtUtil.generateToken(superAdmin);

        // Sales A list includes QT-DIRECT-A but excludes QT-DIRECT-B
        mockMvc.perform(get("/api/admin/quotations").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].quotationNumber", hasItem("QT-DIRECT-A")))
                .andExpect(jsonPath("$.content[*].quotationNumber", not(hasItem("QT-DIRECT-B"))));

        // Sales B list includes QT-DIRECT-B but excludes QT-DIRECT-A
        mockMvc.perform(get("/api/admin/quotations").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].quotationNumber", hasItem("QT-DIRECT-B")))
                .andExpect(jsonPath("$.content[*].quotationNumber", not(hasItem("QT-DIRECT-A"))));

        // Super Admin list includes both QT-DIRECT-A and QT-DIRECT-B
        mockMvc.perform(get("/api/admin/quotations").header("Authorization", "Bearer " + tokenSA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[*].quotationNumber", hasItem("QT-DIRECT-A")))
                .andExpect(jsonPath("$.content[*].quotationNumber", hasItem("QT-DIRECT-B")));
    }

    @Test
    void testFinancialModificationsRestrictedToSuperAdmin() throws Exception {
        String tokenSales = jwtUtil.generateToken(salesA);
        String tokenSA = jwtUtil.generateToken(superAdmin);

        // Sales cannot issue invoice directly (403 Forbidden)
        mockMvc.perform(post("/api/admin/invoices/1/issue")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        // Sales cannot convert quotation to invoice (403 Forbidden)
        mockMvc.perform(post("/api/admin/invoices/from-quotation/1?type=TAX_INVOICE")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        // Sales has authorized read-only access to invoices (200 OK)
        mockMvc.perform(get("/api/admin/invoices")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isOk());

        // Super Admin has authorized read access to invoices (200 OK)
        mockMvc.perform(get("/api/admin/invoices")
                .header("Authorization", "Bearer " + tokenSA))
                .andExpect(status().isOk());
    }

    @Test
    void testReceivablesAndReportsRestrictedToSuperAdmin() throws Exception {
        String tokenSales = jwtUtil.generateToken(salesA);
        String tokenSA = jwtUtil.generateToken(superAdmin);

        // Sales receives 403 Forbidden for receivables
        mockMvc.perform(get("/api/admin/receivables")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/dashboard/receivables")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        // Sales receives 403 Forbidden for reports & report export
        mockMvc.perform(get("/api/admin/reports/summary")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/reports/quotations")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/admin/reports/export?reportType=INVOICES")
                .header("Authorization", "Bearer " + tokenSales))
                .andExpect(status().isForbidden());

        // Super Admin receives 200 OK for receivables
        mockMvc.perform(get("/api/admin/receivables")
                .header("Authorization", "Bearer " + tokenSA))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/dashboard/receivables")
                .header("Authorization", "Bearer " + tokenSA))
                .andExpect(status().isOk());

        // Super Admin receives 200 OK for reports & report export
        mockMvc.perform(get("/api/admin/reports/summary")
                .header("Authorization", "Bearer " + tokenSA))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/admin/reports/export?reportType=INVOICES")
                .header("Authorization", "Bearer " + tokenSA))
                .andExpect(status().isOk());
    }
}
