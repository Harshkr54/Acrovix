package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class PaymentRequest {

    @NotNull(message = "Invoice ID is required")
    private Long invoiceId;

    @NotNull(message = "Payment Date is required")
    private LocalDate paymentDate;

    @NotNull(message = "Payment Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    private BigDecimal amount;

    private Currency currency;

    @NotNull(message = "Payment Method is required")
    private PaymentMethod paymentMethod;

    private String transactionReference;
    private String chequeNumber;
    private String bankName;
    private String notes;
}
