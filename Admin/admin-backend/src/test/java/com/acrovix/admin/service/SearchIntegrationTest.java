package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;

@SpringBootTest
public class SearchIntegrationTest {

    @Autowired
    private AdminEnquiryService enquiryService;

    @Autowired
    private QuotationService quotationService;

    @Test
    void testSearchEnquiries() {
        AdminUser admin = new AdminUser();
        admin.setId(1L);
        admin.setRole(Role.SUPER_ADMIN);
        enquiryService.getAllEnquiries(PageRequest.of(0, 5), "quo", null, null, null, null, null, admin);
    }

    @Test
    void testSearchQuotations() {
        AdminUser admin = new AdminUser();
        admin.setId(1L);
        admin.setRole(Role.SUPER_ADMIN);
        quotationService.getAllQuotations(PageRequest.of(0, 5), "quo", admin);
    }
}
