package com.acrovix.admin.dto;

import com.acrovix.admin.entity.InvoiceType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class InvoiceRequest {

    private Long id; // Used for update draft

    @NotNull(message = "Invoice Type is required")
    private InvoiceType invoiceType;

    private Long customerId;
    private Long quotationId;
    private Long purchaseOrderId;

    @NotNull(message = "Invoice Date is required")
    private LocalDate invoiceDate;

    private LocalDate dueDate;
    
    private String clientName;
    private String clientCompany;
    private String clientEmail;
    private String clientPhone;
    private String clientAddress;
    private String clientGstin;

    private String placeOfSupply;
    private String paymentTerms;
    private String termsAndConditions;

    private List<InvoiceItemRequest> items;
}
