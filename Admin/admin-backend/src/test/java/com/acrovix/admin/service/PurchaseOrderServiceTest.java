package com.acrovix.admin.service;

import com.acrovix.admin.dto.PurchaseOrderRequest;
import com.acrovix.admin.dto.PurchaseOrderResponse;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.PurchaseOrder;
import com.acrovix.admin.entity.PurchaseOrderReceivedVia;
import com.acrovix.admin.entity.PurchaseOrderStatus;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.PurchaseOrderRepository;
import com.acrovix.admin.repository.QuotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PurchaseOrderServiceTest {

    @Mock
    private PurchaseOrderRepository purchaseOrderRepository;
    @Mock
    private QuotationRepository quotationRepository;
    @Mock
    private SequenceGeneratorService sequenceGeneratorService;
    @Mock
    private AdminActivityRepository activityRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private AuthorizationService authorizationService;
    @Mock
    private PdfService pdfService;

    @InjectMocks
    private PurchaseOrderService purchaseOrderService;

    private AdminUser mockUser;
    private Quotation mockQuotation;

    @BeforeEach
    void setUp() {
        mockUser = AdminUser.builder()
                .id(1L)
                .name("Admin")
                .email("admin@acrovix.com")
                .build();

        mockQuotation = Quotation.builder()
                .id(100L)
                .quotationNumber("ACX-Q-2026-0001")
                .status("ACCEPTED")
                .grandTotal(new BigDecimal("100000.00"))
                .build();
    }

    @Test
    void createPurchaseOrder_Success() {
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(100L)).thenReturn(false);
        when(sequenceGeneratorService.generateNextPurchaseOrderNumber(any())).thenReturn("ACX/PO/26-27/0001");
        
        PurchaseOrder savedPo = PurchaseOrder.builder()
                .id(1L)
                .poNumber("ACX/PO/26-27/0001")
                .quotation(mockQuotation)
                .poValue(new BigDecimal("95000.00"))
                .status(PurchaseOrderStatus.RECEIVED)
                .createdBy(mockUser)
                .createdAt(LocalDateTime.now())
                .build();
                
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenReturn(savedPo);

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);
        req.setPoDate(LocalDate.now());
        req.setPoValue(new BigDecimal("95000.00"));
        
        PurchaseOrderResponse res = purchaseOrderService.createPurchaseOrder(req, mockUser);

        assertNotNull(res);
        assertEquals("ACX/PO/26-27/0001", res.getPoNumber());
        assertEquals(PurchaseOrderStatus.RECEIVED, res.getStatus());
        assertTrue(res.isValueMismatch()); // 100k vs 95k
        assertEquals(new BigDecimal("-5000.00"), res.getDifference());
        assertEquals("CONVERTED", mockQuotation.getStatus());

        verify(quotationRepository).save(mockQuotation);
        verify(activityRepository).save(any());
    }

    @Test
    void createPurchaseOrder_FailsIfNotAccepted() {
        mockQuotation.setStatus("SENT");
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);

        assertThrows(IllegalArgumentException.class, () -> purchaseOrderService.createPurchaseOrder(req, mockUser));
    }

    @Test
    void createPurchaseOrder_FailsIfDuplicate() {
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(100L)).thenReturn(true);

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);

        assertThrows(ResourceConflictException.class, () -> purchaseOrderService.createPurchaseOrder(req, mockUser));
    }
}
