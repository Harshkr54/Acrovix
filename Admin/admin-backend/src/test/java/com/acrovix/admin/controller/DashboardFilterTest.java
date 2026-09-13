package com.acrovix.admin.controller;

import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminEnquiryRepository;
import com.acrovix.admin.repository.QuotationRepository;
import com.acrovix.admin.service.DashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardFilterTest {

    @Mock
    private AdminEnquiryRepository enquiryRepository;
    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private AdminActivityRepository activityRepository;

    @InjectMocks
    private DashboardService dashboardService;

    private AdminEnquiry activeEnquiry;
    private Quotation activeQuotation;
    private Quotation trashedQuotation;

    @BeforeEach
    void setUp() {
        activeEnquiry = AdminEnquiry.builder()
                .id(1L)
                .referenceId("ACX-ENQ-001")
                .fullName("Test Client")
                .status("NEW")
                .createdAt(LocalDateTime.now())
                .build();

        activeQuotation = Quotation.builder()
                .id(10L)
                .quotationNumber("ACX-Q-2026-0001")
                .status("DRAFT")
                .grandTotal(BigDecimal.valueOf(1000))
                .createdAt(LocalDateTime.now())
                .deletedAt(null)
                .build();

        trashedQuotation = Quotation.builder()
                .id(11L)
                .quotationNumber("ACX-Q-2026-0002")
                .status("DRAFT")
                .grandTotal(BigDecimal.valueOf(2000))
                .createdAt(LocalDateTime.now())
                .deletedAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testAllTimePresetDefaultFilters() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(5L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(3L);
        when(activityRepository.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(activeEnquiry)));

        Map<String, Object> stats = dashboardService.getDashboardStats("ALL_TIME", "ALL", "ALL", null, null);

        assertNotNull(stats);
        assertEquals(5L, stats.get("totalEnquiries"));
        assertEquals(3L, stats.get("totalQuotations"));
        verify(quotationRepository, atLeastOnce()).count(any(Specification.class));
    }

    @Test
    void testTodayPresetFilter() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(2L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(1L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("TODAY", "ALL", "ALL", null, null);

        assertNotNull(stats);
        assertEquals(2L, stats.get("totalEnquiries"));
    }

    @Test
    void testLast7DaysPresetFilter() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(4L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(2L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("LAST_7_DAYS", "ALL", "ALL", null, null);

        assertNotNull(stats);
        assertEquals(4L, stats.get("totalEnquiries"));
    }

    @Test
    void testLast30DaysPresetFilter() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(10L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(5L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("LAST_30_DAYS", "ALL", "ALL", null, null);

        assertNotNull(stats);
        assertEquals(10L, stats.get("totalEnquiries"));
    }

    @Test
    void testThisMonthPresetFilter() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(8L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(4L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("THIS_MONTH", "ALL", "ALL", null, null);

        assertNotNull(stats);
        assertEquals(8L, stats.get("totalEnquiries"));
    }

    @Test
    void testThisYearPresetFilter() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(25L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(12L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("THIS_YEAR", "ALL", "ALL", null, null);

        assertNotNull(stats);
        assertEquals(25L, stats.get("totalEnquiries"));
    }

    @Test
    void testValidCustomDateRange() {
        String fromDate = LocalDate.now().minusDays(5).toString();
        String toDate = LocalDate.now().toString();

        when(enquiryRepository.count(any(Specification.class))).thenReturn(3L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(1L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("CUSTOM", "ALL", "ALL", fromDate, toDate);

        assertNotNull(stats);
        assertEquals(3L, stats.get("totalEnquiries"));
    }

    @Test
    void testInvalidCustomDateRangeThrowsException() {
        String fromDate = "2026-09-15";
        String toDate = "2026-09-10";

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> dashboardService.getDashboardStats("CUSTOM", "ALL", "ALL", fromDate, toDate)
        );
        assertEquals("fromDate cannot be after toDate", ex.getMessage());
    }

    @Test
    void testMissingCustomDatesThrowsException() {
        assertThrows(
                IllegalArgumentException.class,
                () -> dashboardService.getDashboardStats("CUSTOM", "ALL", "ALL", null, null)
        );
    }

    @Test
    void testEveryEnquiryStatusFilter() {
        List<String> statuses = List.of("NEW", "CONTACTED", "QUOTED", "CONVERTED", "CLOSED");
        when(enquiryRepository.count(any(Specification.class))).thenReturn(1L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(0L);
        when(activityRepository.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        for (String status : statuses) {
            Map<String, Object> stats = dashboardService.getDashboardStats("ALL_TIME", status, "ALL", null, null);
            assertNotNull(stats);
        }
    }

    @Test
    void testEveryQuotationStatusFilter() {
        List<String> statuses = List.of("DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED");
        when(enquiryRepository.count(any(Specification.class))).thenReturn(0L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(1L);
        when(activityRepository.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        for (String status : statuses) {
            Map<String, Object> stats = dashboardService.getDashboardStats("ALL_TIME", "ALL", status, null, null);
            assertNotNull(stats);
        }
    }

    @Test
    void testCombinedFiltersDateEnquiryQuotationStatus() {
        String fromDate = "2026-09-01";
        String toDate = "2026-09-13";

        when(enquiryRepository.count(any(Specification.class))).thenReturn(2L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(1L);
        when(activityRepository.findTop50ByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtDesc(any(), any())).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(activeEnquiry)));

        Map<String, Object> stats = dashboardService.getDashboardStats("CUSTOM", "NEW", "ACCEPTED", fromDate, toDate);

        assertNotNull(stats);
        assertEquals(2L, stats.get("totalEnquiries"));
    }

    @Test
    void testZeroMatchingResultsReturns200WithZeroCounts() {
        when(enquiryRepository.count(any(Specification.class))).thenReturn(0L);
        when(quotationRepository.count(any(Specification.class))).thenReturn(0L);
        when(activityRepository.findTop50ByOrderByCreatedAtDesc()).thenReturn(List.of());
        when(enquiryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));

        Map<String, Object> stats = dashboardService.getDashboardStats("ALL_TIME", "CLOSED", "EXPIRED", null, null);

        assertNotNull(stats);
        assertEquals(0L, stats.get("totalEnquiries"));
        assertEquals(0L, stats.get("newEnquiries"));
        assertEquals(0L, stats.get("totalQuotations"));
        assertEquals(0L, stats.get("acceptedQuotations"));
        assertEquals(0.0, stats.get("conversionRate"));
        assertTrue(((List<?>) stats.get("recentActivities")).isEmpty());
        assertTrue(((List<?>) stats.get("recentEnquiries")).isEmpty());
    }

    @Test
    void testInvalidEnumParametersThrowException() {
        assertThrows(
                IllegalArgumentException.class,
                () -> dashboardService.getDashboardStats("INVALID_RANGE", "ALL", "ALL", null, null)
        );
        assertThrows(
                IllegalArgumentException.class,
                () -> dashboardService.getDashboardStats("ALL_TIME", "INVALID_STATUS", "ALL", null, null)
        );
        assertThrows(
                IllegalArgumentException.class,
                () -> dashboardService.getDashboardStats("ALL_TIME", "ALL", "INVALID_STATUS", null, null)
        );
    }
}
