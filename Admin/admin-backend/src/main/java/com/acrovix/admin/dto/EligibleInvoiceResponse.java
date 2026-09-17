package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.entity.InvoiceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EligibleInvoiceResponse {
    private Long id;
    private String invoiceNumber;
    private Currency currency;
    private InvoiceType invoiceType;
    private InvoiceStatus status;
    private Long customerId;
    private String clientName;
    private String clientCompany;
    private BigDecimal grandTotal;
    private BigDecimal amountPaid;
    private BigDecimal balanceDue;
    private LocalDate invoiceDate;
    private LocalDate dueDate;
}
