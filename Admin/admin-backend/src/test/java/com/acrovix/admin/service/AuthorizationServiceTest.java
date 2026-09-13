package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import static org.junit.jupiter.api.Assertions.*;

class AuthorizationServiceTest {

    private AuthorizationService authorizationService;

    private AdminUser superAdmin;
    private AdminUser salesUser1;
    private AdminUser salesUser2;

    @BeforeEach
    void setUp() {
        authorizationService = new AuthorizationService();

        superAdmin = AdminUser.builder()
                .id(1L)
                .email("admin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .build();

        salesUser1 = AdminUser.builder()
                .id(2L)
                .email("sales1@acrovix.com")
                .role(Role.SALES)
                .build();

        salesUser2 = AdminUser.builder()
                .id(3L)
                .email("sales2@acrovix.com")
                .role(Role.SALES)
                .build();
    }

    @Test
    void testSuperAdminCanAccessAnyEnquiry() {
        AdminEnquiry enquiryAssignedToSales1 = AdminEnquiry.builder()
                .id(100L)
                .assignedTo(salesUser1)
                .build();

        assertDoesNotThrow(() -> authorizationService.checkEnquiryAccess(superAdmin, enquiryAssignedToSales1));
    }

    @Test
    void testSalesCanAccessOwnAssignedEnquiry() {
        AdminEnquiry enquiry = AdminEnquiry.builder()
                .id(100L)
                .assignedTo(salesUser1)
                .build();

        assertDoesNotThrow(() -> authorizationService.checkEnquiryAccess(salesUser1, enquiry));
    }

    @Test
    void testSalesCanAccessUnassignedEnquiry() {
        AdminEnquiry unassignedEnquiry = AdminEnquiry.builder()
                .id(101L)
                .assignedTo(null)
                .build();

        assertDoesNotThrow(() -> authorizationService.checkEnquiryAccess(salesUser1, unassignedEnquiry));
    }

    @Test
    void testSalesCannotAccessOtherSalesAssignedEnquiry() {
        AdminEnquiry enquiryAssignedToSales2 = AdminEnquiry.builder()
                .id(102L)
                .assignedTo(salesUser2)
                .build();

        assertThrows(AccessDeniedException.class, () -> authorizationService.checkEnquiryAccess(salesUser1, enquiryAssignedToSales2));
    }

    @Test
    void testSuperAdminCanAccessAnyQuotation() {
        Quotation quotation = Quotation.builder()
                .id(200L)
                .createdBy(salesUser2)
                .enquiry(AdminEnquiry.builder().id(102L).assignedTo(salesUser2).build())
                .build();

        assertDoesNotThrow(() -> authorizationService.checkQuotationAccess(superAdmin, quotation));
    }

    @Test
    void testSalesCanAccessOwnCreatedQuotation() {
        Quotation quotation = Quotation.builder()
                .id(201L)
                .createdBy(salesUser1)
                .build();

        assertDoesNotThrow(() -> authorizationService.checkQuotationAccess(salesUser1, quotation));
    }

    @Test
    void testSalesCanAccessQuotationForOwnAssignedEnquiry() {
        AdminEnquiry enquiry = AdminEnquiry.builder().id(100L).assignedTo(salesUser1).build();
        Quotation quotation = Quotation.builder()
                .id(202L)
                .createdBy(salesUser2)
                .enquiry(enquiry)
                .build();

        assertDoesNotThrow(() -> authorizationService.checkQuotationAccess(salesUser1, quotation));
    }

    @Test
    void testSalesCannotAccessOtherSalesQuotation() {
        AdminEnquiry enquiry = AdminEnquiry.builder().id(102L).assignedTo(salesUser2).build();
        Quotation quotation = Quotation.builder()
                .id(203L)
                .createdBy(salesUser2)
                .enquiry(enquiry)
                .build();

        assertThrows(AccessDeniedException.class, () -> authorizationService.checkQuotationAccess(salesUser1, quotation));
    }
}
