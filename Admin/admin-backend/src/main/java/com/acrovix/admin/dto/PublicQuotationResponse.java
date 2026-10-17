package com.acrovix.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PublicQuotationResponse {

    private Long id;
    private String publicToken;
    private String quotationNumber;
    private String status;
    private Integer version;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDate validUntil;
    private String termsAndConditions;

    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal grandTotal;

    private String clientName;
    private String clientCompany;
    private String clientEmail;
    private String clientPhone;

    // E-signature & acceptance metadata
    private LocalDateTime signedAt;
    private String signerName;
    private String signerNotes;
    private String signatureData;
    private LocalDateTime acceptedAt;
    private String acceptedByName;
    private String acceptedByIp;

    private List<ItemDto> items;
    private TenantBrandingDto tenant;
    private Map<String, Object> bankDetails;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ItemDto {
        private String title;
        private String description;
        private String hsnSac;
        private BigDecimal quantity;
        private String unit;
        private BigDecimal listPrice;
        private BigDecimal discountPercent;
        private BigDecimal unitPrice;
        private BigDecimal taxPercent;
        private BigDecimal taxAmount;
        private BigDecimal total;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TenantBrandingDto {
        private String companyName;
        private String brandName;
        private String legalName;
        private String gstin;
        private String pan;
        private String email;
        private String phone;
        private String website;
        private String address;
        private String logoUrl;
        private String primaryColor;
        private String secondaryColor;
        private String currencyCode;
        private String currencySymbol;
    }
}
