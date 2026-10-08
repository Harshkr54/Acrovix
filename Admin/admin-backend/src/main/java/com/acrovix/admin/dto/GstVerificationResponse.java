package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GstVerificationResponse {
    private boolean success;
    private String gstin;
    private String legalName;
    private String tradeName;
    private String status;
    private String taxpayerType;
    private String registrationDate;
    private String billingAddress;
    private String state;
    private String pincode;
}
