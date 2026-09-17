package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CustomerResponse {
    private Long id;
    private Currency currency;
    private String customerCode;
    private String name;
    private String companyName;
    private String email;
    private String phone;
    private String alternatePhone;
    private String gstin;
    private String pan;
    private String billingAddress;
    private String shippingAddress;
    private String paymentTerms;
    private BigDecimal creditLimit;
    private boolean active;
    private Long createdBy;
    private Long updatedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
