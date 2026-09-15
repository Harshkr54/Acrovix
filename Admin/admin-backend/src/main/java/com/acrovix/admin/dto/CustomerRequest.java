package com.acrovix.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CustomerRequest {
    @NotBlank(message = "Customer code is required")
    @Size(max = 50, message = "Customer code cannot exceed 50 characters")
    private String customerCode;

    @NotBlank(message = "Name is required")
    @Size(max = 150, message = "Name cannot exceed 150 characters")
    private String name;

    @Size(max = 150, message = "Company name cannot exceed 150 characters")
    private String companyName;

    @Size(max = 150, message = "Email cannot exceed 150 characters")
    private String email;

    @Size(max = 50, message = "Phone cannot exceed 50 characters")
    private String phone;

    @Size(max = 50, message = "Alternate phone cannot exceed 50 characters")
    private String alternatePhone;

    @Size(max = 50, message = "GSTIN cannot exceed 50 characters")
    private String gstin;

    @Size(max = 50, message = "PAN cannot exceed 50 characters")
    private String pan;

    private String billingAddress;
    private String shippingAddress;

    @Size(max = 100, message = "Payment terms cannot exceed 100 characters")
    private String paymentTerms;

    private BigDecimal creditLimit;
}
