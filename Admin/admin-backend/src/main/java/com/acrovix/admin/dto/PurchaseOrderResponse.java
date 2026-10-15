package com.acrovix.admin.dto;

import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.entity.PurchaseOrderReceivedVia;
import com.acrovix.admin.entity.PurchaseOrderStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class PurchaseOrderResponse {
    private Long id;
    private String poNumber;
    private Long quotationId;
    private String quotationNumber;
    private String clientName;
    private String clientCompany;
    private String clientEmail;
    private String clientPhone;
    private Currency currency;
    private BigDecimal quotationValue;
    
    private String clientPoNumber;
    private LocalDate poDate;
    private BigDecimal poValue;
    
    private boolean valueMismatch;
    private BigDecimal difference;

    private String poDocumentUrl;
    private PurchaseOrderReceivedVia receivedVia;
    private String remarks;
    private PurchaseOrderStatus status;
    private boolean readOnly;
    
    private AdminUserResponse verifiedBy;
    private LocalDateTime verifiedAt;
    
    private AdminUserResponse createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private BigDecimal invoicedAmount;
    private BigDecimal remainingAmount;
    private Long activeTaxInvoiceId;
    private boolean eligibleForInvoice;

    public PurchaseOrderResponse() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPoNumber() { return poNumber; }
    public void setPoNumber(String poNumber) { this.poNumber = poNumber; }

    public Long getQuotationId() { return quotationId; }
    public void setQuotationId(Long quotationId) { this.quotationId = quotationId; }

    public String getQuotationNumber() { return quotationNumber; }
    public void setQuotationNumber(String quotationNumber) { this.quotationNumber = quotationNumber; }

    public String getClientName() { return clientName; }
    public void setClientName(String clientName) { this.clientName = clientName; }

    public String getClientCompany() { return clientCompany; }
    public void setClientCompany(String clientCompany) { this.clientCompany = clientCompany; }

    public String getClientEmail() { return clientEmail; }
    public void setClientEmail(String clientEmail) { this.clientEmail = clientEmail; }

    public String getClientPhone() { return clientPhone; }
    public void setClientPhone(String clientPhone) { this.clientPhone = clientPhone; }

    public Currency getCurrency() { return currency; }
    public void setCurrency(Currency currency) { this.currency = currency; }

    public BigDecimal getQuotationValue() { return quotationValue; }
    public void setQuotationValue(BigDecimal quotationValue) { this.quotationValue = quotationValue; }

    public String getClientPoNumber() { return clientPoNumber; }
    public void setClientPoNumber(String clientPoNumber) { this.clientPoNumber = clientPoNumber; }

    public LocalDate getPoDate() { return poDate; }
    public void setPoDate(LocalDate poDate) { this.poDate = poDate; }

    public BigDecimal getPoValue() { return poValue; }
    public void setPoValue(BigDecimal poValue) { this.poValue = poValue; }

    public boolean isValueMismatch() { return valueMismatch; }
    public void setValueMismatch(boolean valueMismatch) { this.valueMismatch = valueMismatch; }

    public BigDecimal getDifference() { return difference; }
    public void setDifference(BigDecimal difference) { this.difference = difference; }

    public String getPoDocumentUrl() { return poDocumentUrl; }
    public void setPoDocumentUrl(String poDocumentUrl) { this.poDocumentUrl = poDocumentUrl; }

    public PurchaseOrderReceivedVia getReceivedVia() { return receivedVia; }
    public void setReceivedVia(PurchaseOrderReceivedVia receivedVia) { this.receivedVia = receivedVia; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public PurchaseOrderStatus getStatus() { return status; }
    public void setStatus(PurchaseOrderStatus status) { this.status = status; }

    public boolean isReadOnly() { return readOnly; }
    public void setReadOnly(boolean readOnly) { this.readOnly = readOnly; }

    public AdminUserResponse getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(AdminUserResponse verifiedBy) { this.verifiedBy = verifiedBy; }

    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }

    public AdminUserResponse getCreatedBy() { return createdBy; }
    public void setCreatedBy(AdminUserResponse createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public BigDecimal getInvoicedAmount() { return invoicedAmount; }
    public void setInvoicedAmount(BigDecimal invoicedAmount) { this.invoicedAmount = invoicedAmount; }

    public BigDecimal getRemainingAmount() { return remainingAmount; }
    public void setRemainingAmount(BigDecimal remainingAmount) { this.remainingAmount = remainingAmount; }

    public Long getActiveTaxInvoiceId() { return activeTaxInvoiceId; }
    public void setActiveTaxInvoiceId(Long activeTaxInvoiceId) { this.activeTaxInvoiceId = activeTaxInvoiceId; }

    private String deliveryAddress;
    private String deliveryContactName;
    private String deliveryContactPhone;
    private String deliveryDestinationType;

    public String getDeliveryAddress() { return deliveryAddress; }
    public void setDeliveryAddress(String deliveryAddress) { this.deliveryAddress = deliveryAddress; }

    public String getDeliveryContactName() { return deliveryContactName; }
    public void setDeliveryContactName(String deliveryContactName) { this.deliveryContactName = deliveryContactName; }

    public String getDeliveryContactPhone() { return deliveryContactPhone; }
    public void setDeliveryContactPhone(String deliveryContactPhone) { this.deliveryContactPhone = deliveryContactPhone; }

    public String getDeliveryDestinationType() { return deliveryDestinationType; }
    public void setDeliveryDestinationType(String deliveryDestinationType) { this.deliveryDestinationType = deliveryDestinationType; }

    public boolean isEligibleForInvoice() { return eligibleForInvoice; }
    public void setEligibleForInvoice(boolean eligibleForInvoice) { this.eligibleForInvoice = eligibleForInvoice; }

    private String clientBillingAddress;
    private String clientShippingAddress;
    private String clientGstin;
    private String clientPan;
    private String clientState;
    private String clientPincode;

    public String getClientBillingAddress() { return clientBillingAddress; }
    public void setClientBillingAddress(String clientBillingAddress) { this.clientBillingAddress = clientBillingAddress; }

    public String getClientShippingAddress() { return clientShippingAddress; }
    public void setClientShippingAddress(String clientShippingAddress) { this.clientShippingAddress = clientShippingAddress; }

    public String getClientGstin() { return clientGstin; }
    public void setClientGstin(String clientGstin) { this.clientGstin = clientGstin; }

    public String getClientPan() { return clientPan; }
    public void setClientPan(String clientPan) { this.clientPan = clientPan; }

    public String getClientState() { return clientState; }
    public void setClientState(String clientState) { this.clientState = clientState; }

    public String getClientPincode() { return clientPincode; }
    public void setClientPincode(String clientPincode) { this.clientPincode = clientPincode; }
}
