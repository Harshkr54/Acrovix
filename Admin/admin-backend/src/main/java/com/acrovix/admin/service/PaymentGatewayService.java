package com.acrovix.admin.service;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.InvoiceStatus;
import com.acrovix.admin.repository.InvoiceRepository;
import com.razorpay.PaymentLink;
import com.razorpay.RazorpayClient;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class PaymentGatewayService {

    private final InvoiceRepository invoiceRepository;
    
    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;
    
    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    @Transactional
    public Invoice generatePaymentLink(Long invoiceId) {
        Invoice invoice = invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));

        if (invoice.getStatus() != InvoiceStatus.ISSUED) {
            throw new IllegalStateException("Payment link can only be generated for ISSUED invoices");
        }

        if (invoice.getBalanceDue().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Invoice is already fully paid");
        }
        
        // If link already exists, just return the invoice
        if (invoice.getPaymentLinkId() != null && invoice.getPaymentLinkUrl() != null) {
            return invoice;
        }

        if (razorpayKeyId == null || razorpayKeyId.isBlank() || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new IllegalStateException("Razorpay credentials are not configured");
        }

        try {
            RazorpayClient razorpay = new RazorpayClient(razorpayKeyId, razorpayKeySecret);

            JSONObject paymentLinkRequest = new JSONObject();
            // Amount is in subunits (paise)
            long amountInPaise = invoice.getBalanceDue().multiply(new BigDecimal("100")).longValue();
            paymentLinkRequest.put("amount", amountInPaise);
            paymentLinkRequest.put("currency", invoice.getCurrency().name());
            paymentLinkRequest.put("accept_partial", false);
            paymentLinkRequest.put("description", "Payment for Invoice " + invoice.getInvoiceNumber());
            
            JSONObject customer = new JSONObject();
            customer.put("name", invoice.getClientName() != null ? invoice.getClientName() : "Customer");
            if (invoice.getClientEmail() != null && !invoice.getClientEmail().isBlank()) {
                customer.put("email", invoice.getClientEmail());
            }
            if (invoice.getClientPhone() != null && !invoice.getClientPhone().isBlank()) {
                customer.put("contact", invoice.getClientPhone());
            }
            paymentLinkRequest.put("customer", customer);

            paymentLinkRequest.put("notify", new JSONObject().put("sms", false).put("email", false));
            paymentLinkRequest.put("reminder_enable", false);
            paymentLinkRequest.put("reference_id", invoice.getInvoiceNumber());

            long expireBy = Instant.now().plusSeconds(30 * 24 * 60 * 60).getEpochSecond(); // 30 days
            paymentLinkRequest.put("expire_by", expireBy);

            PaymentLink paymentLink = razorpay.paymentLink.create(paymentLinkRequest);

            invoice.setPaymentLinkId(paymentLink.get("id"));
            invoice.setPaymentLinkUrl(paymentLink.get("short_url"));
            
            return invoiceRepository.save(invoice);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate Razorpay Payment Link: " + e.getMessage(), e);
        }
    }
}
