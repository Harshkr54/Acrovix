package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class QuotationSearchTest {

    @Mock
    private QuotationRepository quotationRepository;

    @InjectMocks
    private QuotationService quotationService;

    private AdminUser superAdmin;
    private AdminUser salesRep;

    @BeforeEach
    void setUp() {
        superAdmin = AdminUser.builder()
                .id(1L)
                .name("Super Admin")
                .role(Role.SUPER_ADMIN)
                .build();

        salesRep = AdminUser.builder()
                .id(2L)
                .name("Sales Rep")
                .role(Role.SALES)
                .build();
    }

    @Test
    void testSuperAdmin_EmptySearch_PaginationPassed() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Quotation> expectedPage = new PageImpl<>(List.of(new Quotation(), new Quotation()));
        when(quotationRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<Quotation> result = quotationService.getAllQuotations(pageable, "", superAdmin);

        assertEquals(2, result.getTotalElements());
        
        ArgumentCaptor<Specification<Quotation>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        verify(quotationRepository).findAll(specCaptor.capture(), eq(pageable));
        assertNotNull(specCaptor.getValue());
    }

    @Test
    void testSalesRep_PartialQuotationSearch_IsolationPassed() {
        Pageable pageable = PageRequest.of(0, 5);
        Page<Quotation> expectedPage = new PageImpl<>(List.of(new Quotation()));
        when(quotationRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<Quotation> result = quotationService.getAllQuotations(pageable, "ACX-Q-2026", salesRep);

        assertEquals(1, result.getTotalElements());

        ArgumentCaptor<Specification<Quotation>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        verify(quotationRepository).findAll(specCaptor.capture(), eq(pageable));
        assertNotNull(specCaptor.getValue());
    }

    @Test
    void testSearchByClientDetails() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Quotation> expectedPage = new PageImpl<>(List.of(new Quotation()));
        when(quotationRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<Quotation> result = quotationService.getAllQuotations(pageable, "client@company.com", superAdmin);

        assertEquals(1, result.getTotalElements());

        ArgumentCaptor<Specification<Quotation>> specCaptor = ArgumentCaptor.forClass(Specification.class);
        verify(quotationRepository).findAll(specCaptor.capture(), eq(pageable));
        assertNotNull(specCaptor.getValue());
    }
}
