package com.acrovix.admin.dto;

import com.acrovix.admin.entity.PaymentMethod;
import com.acrovix.admin.entity.PaymentStatus;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PaymentResponse {

    private Long id;
    private String paymentNumber;

    private Long invoiceId;
    private String invoiceNumber;

    private Long customerId;
    private String customerCode;
    private String customerName;
    private String clientName;
    private String clientCompany;

    private LocalDate paymentDate;
    private BigDecimal amount;
    private PaymentMethod paymentMethod;
    private String transactionReference;
    private String chequeNumber;
    private String bankName;
    private String notes;
    private PaymentStatus status;

    private Long recordedById;
    private String recordedByUsername;
    private String recordedByFullName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime cancelledAt;
    private String cancellationReason;
}
