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
                .currency(com.acrovix.admin.entity.Currency.INR)
                .status("ACCEPTED")
                .grandTotal(new BigDecimal("100000.00"))
                .build();
    }

    @Test
    void createPurchaseOrder_Success() {
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(100L)).thenReturn(false);
        when(sequenceGeneratorService.generateNextPurchaseOrderNumber(any())).thenReturn("ACX/PO/26-27/0001");
        
        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> {
            PurchaseOrder argument = invocation.getArgument(0);
            argument.setId(1L);
            argument.setCreatedAt(LocalDateTime.now());
            return argument;
        });

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);
        req.setPoDate(LocalDate.now());
        req.setPoValue(new BigDecimal("100000.00"));
        
        PurchaseOrderResponse res = purchaseOrderService.createPurchaseOrder(req, mockUser);

        assertNotNull(res);
        assertEquals("ACX/PO/26-27/0001", res.getPoNumber());
        assertEquals(PurchaseOrderStatus.RECEIVED, res.getStatus());
        assertEquals(new BigDecimal("100000.00"), res.getPoValue());
        assertFalse(res.isValueMismatch());
        assertEquals(BigDecimal.ZERO, res.getDifference().stripTrailingZeros());
        assertEquals("CONVERTED", mockQuotation.getStatus());

        verify(quotationRepository).save(mockQuotation);
        verify(activityRepository).save(any());
    }

    @Test
    void createPurchaseOrder_DerivesPoValueIgnoringClientTampering() {
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(100L)).thenReturn(false);
        when(sequenceGeneratorService.generateNextPurchaseOrderNumber(any())).thenReturn("ACX/PO/26-27/0002");

        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> {
            PurchaseOrder argument = invocation.getArgument(0);
            argument.setId(2L);
            argument.setCreatedAt(LocalDateTime.now());
            return argument;
        });

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);
        req.setPoDate(LocalDate.now());
        // Client maliciously or erroneously supplies 50000 instead of 100000
        req.setPoValue(new BigDecimal("50000.00"));

        PurchaseOrderResponse res = purchaseOrderService.createPurchaseOrder(req, mockUser);

        assertNotNull(res);
        // Authoritative value from persisted quotation grand total must be used
        assertEquals(new BigDecimal("100000.00"), res.getPoValue());
        assertFalse(res.isValueMismatch());
    }

    @Test
    void createPurchaseOrder_SupportsUsdCurrency() {
        Quotation usdQuotation = Quotation.builder()
                .id(200L)
                .quotationNumber("ACX-Q-2026-USD")
                .currency(com.acrovix.admin.entity.Currency.USD)
                .status("ACCEPTED")
                .grandTotal(new BigDecimal("2450.75"))
                .build();

        when(quotationRepository.findById(200L)).thenReturn(Optional.of(usdQuotation));
        when(purchaseOrderRepository.existsByQuotationIdAndDeletedAtIsNull(200L)).thenReturn(false);
        when(sequenceGeneratorService.generateNextPurchaseOrderNumber(any())).thenReturn("ACX/PO/26-27/0003");

        when(purchaseOrderRepository.save(any(PurchaseOrder.class))).thenAnswer(invocation -> {
            PurchaseOrder argument = invocation.getArgument(0);
            argument.setId(3L);
            argument.setCreatedAt(LocalDateTime.now());
            return argument;
        });

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(200L);
        req.setPoDate(LocalDate.now());
        req.setPoValue(new BigDecimal("2450.75"));

        PurchaseOrderResponse res = purchaseOrderService.createPurchaseOrder(req, mockUser);

        assertNotNull(res);
        assertEquals(com.acrovix.admin.entity.Currency.USD, res.getCurrency());
        assertEquals(new BigDecimal("2450.75"), res.getPoValue());
        assertFalse(res.isValueMismatch());
    }

    @Test
    void createPurchaseOrder_FailsIfGrandTotalNull() {
        mockQuotation.setGrandTotal(null);
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);
        req.setPoDate(LocalDate.now());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> purchaseOrderService.createPurchaseOrder(req, mockUser));
        assertTrue(ex.getMessage().contains("valid grand total"));
    }

    @Test
    void createPurchaseOrder_FailsIfGrandTotalZeroOrNegative() {
        mockQuotation.setGrandTotal(BigDecimal.ZERO);
        when(quotationRepository.findById(100L)).thenReturn(Optional.of(mockQuotation));

        PurchaseOrderRequest req = new PurchaseOrderRequest();
        req.setQuotationId(100L);
        req.setPoDate(LocalDate.now());

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> purchaseOrderService.createPurchaseOrder(req, mockUser));
        assertTrue(ex.getMessage().contains("valid grand total"));
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
