package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class AdminEnquiryServiceIsolationTest {

    @Mock
    private AdminEnquiryRepository enquiryRepository;

    @Mock
    private AdminUserRepository userRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private AuthorizationService authorizationService;

    @InjectMocks
    private AdminEnquiryService enquiryService;

    private AdminUser superAdmin;
    private AdminUser salesRepA;
    private AdminUser salesRepB;
    private AdminEnquiry unassignedEnquiry;
    private AdminEnquiry salesAEnquiry;
    private AdminEnquiry salesBEnquiry;

    @BeforeEach
    void setUp() {
        superAdmin = AdminUser.builder()
                .id(1L)
                .name("Super Admin")
                .email("superadmin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .build();

        salesRepA = AdminUser.builder()
                .id(2L)
                .name("Sales Rep A")
                .email("salesa@acrovix.com")
                .role(Role.SALES)
                .build();

        salesRepB = AdminUser.builder()
                .id(3L)
                .name("Sales Rep B")
                .email("salesb@acrovix.com")
                .role(Role.SALES)
                .build();

        unassignedEnquiry = AdminEnquiry.builder()
                .id(101L)
                .referenceId("ACX-ENQ-1001")
                .fullName("Unassigned Client")
                .assignedTo(null)
                .build();

        salesAEnquiry = AdminEnquiry.builder()
                .id(102L)
                .referenceId("ACX-ENQ-1002")
                .fullName("Sales A Client")
                .assignedTo(salesRepA)
                .build();

        salesBEnquiry = AdminEnquiry.builder()
                .id(103L)
                .referenceId("ACX-ENQ-1003")
                .fullName("Sales B Client")
                .assignedTo(salesRepB)
                .build();
    }

    @Test
    void superAdmin_PassesSpecificationToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<AdminEnquiry> expectedPage = new PageImpl<>(List.of(unassignedEnquiry, salesAEnquiry, salesBEnquiry));
        when(enquiryRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<AdminEnquiry> result = enquiryService.getAllEnquiries(pageable, null, null, null, null, null, null, superAdmin);
        assertEquals(3, result.getTotalElements());
        verify(enquiryRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void salesRepA_PassesSpecificationToRepository() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<AdminEnquiry> expectedPage = new PageImpl<>(List.of(unassignedEnquiry, salesAEnquiry));
        when(enquiryRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<AdminEnquiry> result = enquiryService.getAllEnquiries(pageable, null, null, null, null, null, null, salesRepA);
        assertEquals(2, result.getTotalElements());
        verify(enquiryRepository).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    void backwardCompatibility_OverloadWithoutCurrentUser() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<AdminEnquiry> expectedPage = new PageImpl<>(List.of(unassignedEnquiry, salesAEnquiry, salesBEnquiry));
        when(enquiryRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<AdminEnquiry> result = enquiryService.getAllEnquiries(pageable, null, null, null, null, null, null);
        assertEquals(3, result.getTotalElements());
    }
}
