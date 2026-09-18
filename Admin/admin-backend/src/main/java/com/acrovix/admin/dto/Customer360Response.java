package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.dto.crm.CrmLeadResponse;
import com.acrovix.admin.dto.crm.CrmFollowUpResponse;
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
@NoArgsConstructor
@AllArgsConstructor
public class Customer360Response {

    private CustomerResponse customer;
    
    // Grouped by Currency (INR, USD)
    private Map<Currency, ReceivableSummaryResponse> summaryByCurrency;

    private List<AdminEnquiryDTO> enquiries;
    private List<CrmLeadResponse> leads;
    private List<CrmFollowUpResponse> followUps;
    private List<QuotationDto> quotations;
    private List<InvoiceResponse> invoices;
    private List<PaymentResponse> payments;
    private List<EmailLogDto> emails;
    private List<AdminActivityResponse> activities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuotationDto {
        private Long id;
        private String quotationNumber;
        private String clientName;
        private String clientCompany;
        private Currency currency;
        private BigDecimal grandTotal;
        private String status;
        private Integer version;
        private LocalDate validUntil;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmailLogDto {
        private Long id;
        private String recipient;
        private String subject;
        private String emailType;
        private String status;
        private LocalDateTime sentAt;
        private String errorMessage;
        private String relatedEntityType;
        private Long relatedEntityId;
    }
}
