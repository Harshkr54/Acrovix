package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.entity.InvoiceType;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class InvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Currency currency;
    private InvoiceType invoiceType;
    private InvoiceStatus status;
    private boolean isLocked;

    private Long customerId;
    private Long quotationId;
    private Long purchaseOrderId;

    private String clientName;
    private String clientCompany;
    private String clientEmail;
    private String clientPhone;
    private String clientAddress;
    private String clientGstin;
    private String placeOfSupply;

    private String supplierCompany;
    private String supplierAddress;
    private String supplierGstin;
    private String supplierState;

    private LocalDate invoiceDate;
    private LocalDate dueDate;
    private LocalDateTime issuedAt;
    private LocalDateTime cancelledAt;

    private String paymentTerms;
    private String termsAndConditions;

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxableAmount;
    private BigDecimal cgstAmount;
    private BigDecimal sgstAmount;
    private BigDecimal igstAmount;
    private BigDecimal taxAmount;
    private BigDecimal grandTotal;
    private BigDecimal amountPaid;
    private BigDecimal balanceDue;
    private String amountInWords;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private String createdByUsername;
    private String createdByFullName;

    private List<InvoiceItemResponse> items;
}
