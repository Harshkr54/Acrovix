package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.QuotationSource;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateDirectQuotationRequest {

    @NotBlank(message = "Client name is required")
    private String clientName;

    private String clientCompany;

    private Long customerId;
    private String gstin;

    @NotBlank(message = "Billing address is required")
    private String billingAddress;

    private String shippingAddress;
    private String state;
    private String pincode;

    @NotBlank(message = "Client email is required")
    @Email(message = "Invalid email format")
    private String clientEmail;

    private String clientPhone;
    private Currency currency;

    @NotNull(message = "Quotation source is required")
    private QuotationSource quotationSource;

    @Size(max = 500, message = "Source notes cannot exceed 500 characters")
    private String sourceNotes;

    public CreateDirectQuotationRequest() {
    }

    public CreateDirectQuotationRequest(String clientName, String clientCompany, Long customerId, String gstin,
                                        String billingAddress, String shippingAddress, String state, String pincode,
                                        String clientEmail, String clientPhone, Currency currency,
                                        QuotationSource quotationSource, String sourceNotes) {
        this.clientName = clientName;
        this.clientCompany = clientCompany;
        this.customerId = customerId;
        this.gstin = gstin;
        this.billingAddress = billingAddress;
        this.shippingAddress = shippingAddress;
        this.state = state;
        this.pincode = pincode;
        this.clientEmail = clientEmail;
        this.clientPhone = clientPhone;
        this.currency = currency;
        this.quotationSource = quotationSource;
        this.sourceNotes = sourceNotes;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String clientName;
        private String clientCompany;
        private Long customerId;
        private String gstin;
        private String billingAddress;
        private String shippingAddress;
        private String state;
        private String pincode;
        private String clientEmail;
        private String clientPhone;
        private Currency currency;
        private QuotationSource quotationSource;
        private String sourceNotes;

        public Builder clientName(String clientName) { this.clientName = clientName; return this; }
        public Builder clientCompany(String clientCompany) { this.clientCompany = clientCompany; return this; }
        public Builder customerId(Long customerId) { this.customerId = customerId; return this; }
        public Builder gstin(String gstin) { this.gstin = gstin; return this; }
        public Builder billingAddress(String billingAddress) { this.billingAddress = billingAddress; return this; }
        public Builder shippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; return this; }
        public Builder state(String state) { this.state = state; return this; }
        public Builder pincode(String pincode) { this.pincode = pincode; return this; }
        public Builder clientEmail(String clientEmail) { this.clientEmail = clientEmail; return this; }
        public Builder clientPhone(String clientPhone) { this.clientPhone = clientPhone; return this; }
        public Builder currency(Currency currency) { this.currency = currency; return this; }
        public Builder quotationSource(QuotationSource quotationSource) { this.quotationSource = quotationSource; return this; }
        public Builder sourceNotes(String sourceNotes) { this.sourceNotes = sourceNotes; return this; }

        public CreateDirectQuotationRequest build() {
            return new CreateDirectQuotationRequest(clientName, clientCompany, customerId, gstin, billingAddress,
                    shippingAddress, state, pincode, clientEmail, clientPhone, currency, quotationSource, sourceNotes);
        }
    }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getClientCompany() { return clientCompany; }
    public void setClientCompany(String clientCompany) { this.clientCompany = clientCompany; }

    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long customerId) { this.customerId = customerId; }

    public String getGstin() { return gstin; }
    public void setGstin(String gstin) { this.gstin = gstin; }

    public String getBillingAddress() { return billingAddress; }
    public void setBillingAddress(String billingAddress) { this.billingAddress = billingAddress; }

    public String getShippingAddress() { return shippingAddress; }
    public void setShippingAddress(String shippingAddress) { this.shippingAddress = shippingAddress; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPincode() { return pincode; }
    public void setPincode(String pincode) { this.pincode = pincode; }

    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }

    public String getClientPhone() { return clientPhone; }
    public void setClientPhone(String clientPhone) { this.clientPhone = clientPhone; }

    public Currency getCurrency() { return currency; }
    public void setCurrency(Currency currency) { this.currency = currency; }

    public QuotationSource getQuotationSource() { return quotationSource; }
    public void setQuotationSource(QuotationSource quotationSource) { this.quotationSource = quotationSource; }

    public String getSourceNotes() { return sourceNotes; }
    public void setSourceNotes(String sourceNotes) { this.sourceNotes = sourceNotes; }
}
