package com.acrovix.admin.service;

import com.acrovix.admin.entity.CrmFollowUp;
import com.acrovix.admin.entity.CrmLead;
import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.Payment;
import com.acrovix.admin.entity.PurchaseOrder;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.util.CurrencyUtils;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Component
public class EmailTemplateBuilder {

    public static final String BRAND_NAME = "ACROVIX INNOVATIONS PRIVATE LIMITED";
    public static final String TAGLINE = "SYNC | SCALE | SUCCEED";
    public static final String CONTACT_EMAIL = "sales@acrovix.com";

    /**
     * Builds a responsive corporate HTML email using ACROVIX visual identity.
     * Dark navy (#0F172A), Teal (#0D9488), White/Light background (#F8FAFC / #FFFFFF).
     * No gradients.
     */
    public String buildCorporateEmail(String title, String contentHtml, String ctaText, String ctaUrl) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html>\n");
        html.append("<html lang=\"en\">\n");
        html.append("<head>\n");
        html.append("  <meta charset=\"UTF-8\">\n");
        html.append("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        html.append("  <title>").append(escapeHtml(title)).append("</title>\n");
        html.append("  <style>\n");
        html.append("    body { margin: 0; padding: 0; background-color: #F8FAFC; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; -webkit-font-smoothing: antialiased; }\n");
        html.append("    .email-container { max-width: 600px; margin: 30px auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }\n");
        html.append("    .header { background-color: #0F172A; padding: 24px 32px; text-align: left; border-bottom: 3px solid #0D9488; }\n");
        html.append("    .brand-name { color: #FFFFFF; font-size: 18px; font-weight: 700; letter-spacing: 0.8px; margin: 0; text-transform: uppercase; }\n");
        html.append("    .tagline { color: #0D9488; font-size: 10px; font-weight: 600; letter-spacing: 2px; margin-top: 4px; text-transform: uppercase; }\n");
        html.append("    .content { padding: 32px; font-size: 15px; line-height: 1.6; color: #334155; }\n");
        html.append("    .title-banner { font-size: 18px; font-weight: 600; color: #0F172A; margin-top: 0; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #F1F5F9; }\n");
        html.append("    .cta-container { text-align: center; margin: 32px 0 16px 0; }\n");
        html.append("    .cta-button { display: inline-block; background-color: #0D9488; color: #FFFFFF !important; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; }\n");
        html.append("    .footer { background-color: #F1F5F9; padding: 20px 32px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; }\n");
        html.append("    .footer-brand { font-weight: 600; color: #0F172A; margin-bottom: 4px; }\n");
        html.append("    .footer-contact { margin-top: 8px; font-size: 12px; color: #64748B; }\n");
        html.append("    .footer-contact a { color: #0D9488; text-decoration: none; }\n");
        html.append("  </style>\n");
        html.append("</head>\n");
        html.append("<body>\n");
        html.append("  <div class=\"email-container\">\n");
        html.append("    <div class=\"header\">\n");
        html.append("      <div class=\"brand-name\">").append(BRAND_NAME).append("</div>\n");
        html.append("      <div class=\"tagline\">").append(TAGLINE).append("</div>\n");
        html.append("    </div>\n");
        html.append("    <div class=\"content\">\n");
        if (title != null && !title.trim().isEmpty()) {
            html.append("      <h2 class=\"title-banner\">").append(escapeHtml(title)).append("</h2>\n");
        }
        html.append("      ").append(contentHtml != null ? contentHtml : "").append("\n");
        if (ctaText != null && !ctaText.trim().isEmpty() && ctaUrl != null && !ctaUrl.trim().isEmpty()) {
            html.append("      <div class=\"cta-container\">\n");
            html.append("        <a href=\"").append(escapeHtml(ctaUrl)).append("\" class=\"cta-button\" target=\"_blank\">").append(escapeHtml(ctaText)).append("</a>\n");
            html.append("      </div>\n");
        }
        html.append("    </div>\n");
        html.append("    <div class=\"footer\">\n");
        html.append("      <div class=\"footer-brand\">").append(BRAND_NAME).append("</div>\n");
        html.append("      <div>Enterprise Resource Planning System</div>\n");
        html.append("      <div class=\"footer-contact\">Contact: <a href=\"mailto:").append(CONTACT_EMAIL).append("\">").append(CONTACT_EMAIL).append("</a></div>\n");
        html.append("      <div style=\"margin-top: 8px; font-size: 11px; color: #94A3B8;\">&copy; ").append(java.time.Year.now().getValue()).append(" ").append(BRAND_NAME).append(". All rights reserved.</div>\n");
        html.append("    </div>\n");
        html.append("  </div>\n");
        html.append("</body>\n");
        html.append("</html>");
        return html.toString();
    }

    public String buildCorporateEmail(String title, String contentHtml) {
        return buildCorporateEmail(title, contentHtml, null, null);
    }

    public String buildQuotationEmailHtml(Quotation quotation) {
        String quotationNo = quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "QT-" + quotation.getId();
        String clientName = quotation.getClientName() != null ? quotation.getClientName() : "Valued Client";
        String clientCompany = quotation.getClientCompany() != null ? quotation.getClientCompany() : "";

        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(escapeHtml(clientName)).append("</strong>")
            .append(clientCompany.isEmpty() ? "" : " (" + escapeHtml(clientCompany) + ")")
            .append(",</p>\n");
        body.append("<p>Please find details of your quotation below:</p>\n");

        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Quotation Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(quotationNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Quotation Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(quotation.getCreatedAt() != null ? quotation.getCreatedAt().toLocalDate().toString() : "N/A").append("</td></tr>\n");
        if (quotation.getValidUntil() != null) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Valid Until:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(quotation.getValidUntil().toString()).append("</td></tr>\n");
        }
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Subtotal:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(quotation.getSubtotal(), quotation.getCurrency())).append("</td></tr>\n");
        if (quotation.getDiscountAmount() != null && quotation.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Discount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">-").append(CurrencyUtils.formatCurrency(quotation.getDiscountAmount(), quotation.getCurrency())).append("</td></tr>\n");
        }
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Tax:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(quotation.getTaxAmount(), quotation.getCurrency())).append("</td></tr>\n");
        body.append("  <tr style=\"background-color:#0F172A; color:#FFFFFF;\"><td style=\"padding:12px; font-weight:700;\">Grand Total (").append(quotation.getCurrency() != null ? quotation.getCurrency().name() : "INR").append("):</td><td style=\"padding:12px; font-weight:700;\">").append(CurrencyUtils.formatCurrency(quotation.getGrandTotal(), quotation.getCurrency())).append("</td></tr>\n");
        body.append("</table>\n");

        if (quotation.getTermsAndConditions() != null && !quotation.getTermsAndConditions().trim().isEmpty()) {
            body.append("<p><strong>Terms & Conditions:</strong><br/>").append(escapeHtml(quotation.getTermsAndConditions())).append("</p>\n");
        }

        body.append("<p>Thank you for choosing ACROVIX INNOVATIONS PRIVATE LIMITED. For queries, contact <a href=\"mailto:sales@acrovix.com\" style=\"color:#0D9488;\">sales@acrovix.com</a>.</p>");

        return buildCorporateEmail("Quotation: " + quotationNo, body.toString());
    }

    public String buildInvoiceEmailHtml(Invoice invoice) {
        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV-" + invoice.getId();
        String customerName = (invoice.getCustomer() != null && invoice.getCustomer().getName() != null) 
                ? invoice.getCustomer().getName() 
                : (invoice.getClientName() != null ? invoice.getClientName() : "Valued Customer");

        BigDecimal grandTotal = invoice.getGrandTotal() != null ? invoice.getGrandTotal() : BigDecimal.ZERO;
        BigDecimal paidAmount = invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO;
        BigDecimal balanceDue = grandTotal.subtract(paidAmount).max(BigDecimal.ZERO);

        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(escapeHtml(customerName)).append("</strong>,</p>\n");
        body.append("<p>Please find details of your invoice below:</p>\n");

        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Invoice Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(invoiceNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Invoice Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(invoice.getInvoiceDate() != null ? invoice.getInvoiceDate().toString() : "N/A").append("</td></tr>\n");
        if (invoice.getDueDate() != null) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Due Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(invoice.getDueDate().toString()).append("</td></tr>\n");
        }
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Subtotal:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(invoice.getSubtotal(), invoice.getCurrency())).append("</td></tr>\n");
        if (invoice.getDiscountAmount() != null && invoice.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Discount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">-").append(CurrencyUtils.formatCurrency(invoice.getDiscountAmount(), invoice.getCurrency())).append("</td></tr>\n");
        }
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Tax:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(invoice.getTaxAmount(), invoice.getCurrency())).append("</td></tr>\n");
        body.append("  <tr style=\"background-color:#0F172A; color:#FFFFFF;\"><td style=\"padding:12px; font-weight:700;\">Grand Total (").append(invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR").append("):</td><td style=\"padding:12px; font-weight:700;\">").append(CurrencyUtils.formatCurrency(grandTotal, invoice.getCurrency())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Amount Paid:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0; color:#0D9488;\">").append(CurrencyUtils.formatCurrency(paidAmount, invoice.getCurrency())).append("</td></tr>\n");
        body.append("  <tr style=\"background-color:#FEF2F2;\"><td style=\"padding:10px; font-weight:700; color:#991B1B;\">Balance Due:</td><td style=\"padding:10px; font-weight:700; color:#991B1B;\">").append(CurrencyUtils.formatCurrency(balanceDue, invoice.getCurrency())).append("</td></tr>\n");
        body.append("</table>\n");

        body.append("<p>Please arrange payment by the due date. For queries, contact <a href=\"mailto:sales@acrovix.com\" style=\"color:#0D9488;\">sales@acrovix.com</a>.</p>");

        return buildCorporateEmail("Invoice: " + invoiceNo, body.toString());
    }

    public String buildPaymentReceiptEmailHtml(Payment payment, BigDecimal remainingBalance) {
        String paymentRef = payment.getPaymentNumber() != null ? payment.getPaymentNumber() : "PAY-" + payment.getId();
        String invoiceNo = (payment.getInvoice() != null && payment.getInvoice().getInvoiceNumber() != null) 
                ? payment.getInvoice().getInvoiceNumber() 
                : "N/A";
        String customerName = (payment.getCustomer() != null && payment.getCustomer().getName() != null) 
                ? payment.getCustomer().getName() 
                : "Valued Customer";

        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(escapeHtml(customerName)).append("</strong>,</p>\n");
        body.append("<p>We have successfully received your payment. Here is your payment receipt summary:</p>\n");

        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Payment Reference:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(paymentRef)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Payment Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(payment.getPaymentDate() != null ? payment.getPaymentDate().toString() : "N/A").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Related Invoice:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(invoiceNo)).append("</td></tr>\n");
        if (payment.getPaymentMethod() != null) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Payment Method:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(payment.getPaymentMethod().name()).append("</td></tr>\n");
        }
        body.append("  <tr style=\"background-color:#0F172A; color:#FFFFFF;\"><td style=\"padding:12px; font-weight:700;\">Amount Received (").append(payment.getCurrency() != null ? payment.getCurrency().name() : "INR").append("):</td><td style=\"padding:12px; font-weight:700; color:#2DD4BF;\">").append(CurrencyUtils.formatCurrency(payment.getAmount(), payment.getCurrency())).append("</td></tr>\n");
        if (remainingBalance != null) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600;\">Remaining Invoice Balance:</td><td style=\"padding:10px;\">").append(CurrencyUtils.formatCurrency(remainingBalance, payment.getCurrency())).append("</td></tr>\n");
        }
        body.append("</table>\n");

        body.append("<p>Thank you for your payment! Contact us at <a href=\"mailto:sales@acrovix.com\" style=\"color:#0D9488;\">sales@acrovix.com</a> for any questions.</p>");

        return buildCorporateEmail("Payment Receipt: " + paymentRef, body.toString());
    }

    public String buildCrmLeadNotificationHtml(CrmLead lead) {
        String leadNo = lead.getLeadNumber() != null ? lead.getLeadNumber() : "LEAD-" + lead.getId();
        String ownerName = (lead.getAssignedTo() != null && lead.getAssignedTo().getName() != null)
                ? lead.getAssignedTo().getName()
                : "Unassigned";

        StringBuilder body = new StringBuilder();
        body.append("<p>A new CRM Lead has been created in ACROVIX ERP:</p>\n");

        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Lead Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(leadNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Contact Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(lead.getFullName() != null ? lead.getFullName() : "N/A")).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Company:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(lead.getCompanyName() != null ? lead.getCompanyName() : "N/A")).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Email:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(lead.getBusinessEmail() != null ? lead.getBusinessEmail() : "N/A")).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Phone:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(lead.getPhoneNumber() != null ? lead.getPhoneNumber() : "N/A")).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Source:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(lead.getLeadSource() != null ? lead.getLeadSource().name() : "N/A").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Priority:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(lead.getPriority() != null ? lead.getPriority().name() : "N/A").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Estimated Value:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(lead.getEstimatedValue(), lead.getCurrency())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600;\">Assigned Owner:</td><td style=\"padding:10px;\">").append(escapeHtml(ownerName)).append("</td></tr>\n");
        body.append("</table>\n");

        return buildCorporateEmail("New Lead: " + leadNo, body.toString());
    }

    public String buildFollowUpNotificationHtml(CrmFollowUp followUp, String notificationType) {
        CrmLead lead = followUp.getLead();
        String leadNo = (lead != null && lead.getLeadNumber() != null) ? lead.getLeadNumber() : "N/A";
        String contactName = (lead != null && lead.getFullName() != null) ? lead.getFullName() : "Lead Contact";
        String ownerName = (followUp.getAssignedTo() != null && followUp.getAssignedTo().getName() != null) 
                ? followUp.getAssignedTo().getName() 
                : "Unassigned";

        StringBuilder body = new StringBuilder();
        body.append("<p><strong>Follow-Up Alert [").append(escapeHtml(notificationType)).append("]</strong></p>\n");

        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Lead Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(leadNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Contact Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(contactName)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Follow-Up Type:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(followUp.getType() != null ? followUp.getType().name() : "N/A").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Scheduled Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(followUp.getScheduledAt() != null ? followUp.getScheduledAt().toString() : "N/A").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Status:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(followUp.getStatus() != null ? followUp.getStatus().name() : "N/A").append("</td></tr>\n");
        if (followUp.getNotes() != null && !followUp.getNotes().trim().isEmpty()) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Notes:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(followUp.getNotes())).append("</td></tr>\n");
        }
        body.append("  <tr><td style=\"padding:10px; font-weight:600;\">Assigned User:</td><td style=\"padding:10px;\">").append(escapeHtml(ownerName)).append("</td></tr>\n");
        body.append("</table>\n");

        return buildCorporateEmail("Follow-Up Notification: " + notificationType, body.toString());
    }

    public String buildLoginSecurityHtml(String userName, String loginTime) {
        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(escapeHtml(userName)).append("</strong>,</p>\n");
        body.append("<p>A new login was detected on your ACROVIX ERP account.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Date & Time:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(loginTime)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Application:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">ACROVIX ERP</td></tr>\n");
        body.append("</table>\n");
        body.append("<p style=\"color:#94A3B8; font-size:12px;\">If you did not perform this login, please contact the administrator immediately.</p>");
        return buildCorporateEmail("Security Alert: New Login", body.toString());
    }

    public String buildWelcomeHtml(AdminUser user, String loginUrl) {
        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(escapeHtml(user.getName())).append("</strong>,</p>\n");
        body.append("<p>Welcome to ACROVIX ERP! Your account has been successfully created.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(user.getName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Email:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(user.getEmail())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Role:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(user.getRole() != null ? user.getRole().name() : "N/A").append("</td></tr>\n");
        body.append("</table>\n");
        if (loginUrl != null && !loginUrl.trim().isEmpty()) {
            body.append("<p>You can log in to the portal here: <a href=\"").append(escapeHtml(loginUrl)).append("\">").append(escapeHtml(loginUrl)).append("</a></p>\n");
        }
        body.append("<p>If you have not received your password, please contact your administrator.</p>");
        return buildCorporateEmail("Welcome to ACROVIX ERP", body.toString());
    }

    public String buildEnquiryNotificationHtml(AdminEnquiry enquiry) {
        StringBuilder body = new StringBuilder();
        body.append("<p>A new enquiry has been submitted.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Enquiry ID:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(enquiry.getId()).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getFullName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Company:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getCompanyName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Email:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getBusinessEmail())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Phone:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getPhoneNumber())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Service Required:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getServiceRequired())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Notes:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getNotes())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(enquiry.getCreatedAt() != null ? enquiry.getCreatedAt().toString() : "").append("</td></tr>\n");
        body.append("</table>\n");
        return buildCorporateEmail("New Enquiry Received", body.toString());
    }

    public String buildEnquiryAssignmentHtml(AdminEnquiry enquiry) {
        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(enquiry.getAssignedTo() != null ? escapeHtml(enquiry.getAssignedTo().getName()) : "User").append("</strong>,</p>\n");
        body.append("<p>An enquiry has been assigned to you.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Enquiry ID:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(enquiry.getId()).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getFullName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Company:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getCompanyName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Service Required:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(enquiry.getServiceRequired())).append("</td></tr>\n");
        body.append("</table>\n");
        return buildCorporateEmail("Enquiry Assigned to You", body.toString());
    }

    public String buildLeadAssignmentHtml(CrmLead lead) {
        String leadNo = lead.getLeadNumber() != null ? lead.getLeadNumber() : "LEAD-" + lead.getId();
        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(lead.getAssignedTo() != null ? escapeHtml(lead.getAssignedTo().getName()) : "User").append("</strong>,</p>\n");
        body.append("<p>A CRM Lead has been assigned to you.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Lead Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(leadNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Contact Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(lead.getFullName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Company:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(lead.getCompanyName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Status:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(lead.getStatus() != null ? lead.getStatus().name() : "N/A").append("</td></tr>\n");
        body.append("</table>\n");
        return buildCorporateEmail("CRM Lead Assigned to You", body.toString());
    }

    public String buildQuotationResponseHtml(Quotation quotation) {
        String quotationNo = quotation.getQuotationNumber() != null ? quotation.getQuotationNumber() : "QT-" + quotation.getId();
        StringBuilder body = new StringBuilder();
        body.append("<p>A quotation has received a response.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Quotation Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(quotationNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Client Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(quotation.getClientName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Total Amount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(quotation.getGrandTotal(), quotation.getCurrency())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Status:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0; color:").append("ACCEPTED".equals(quotation.getStatus()) ? "#16A34A" : "#DC2626").append(";\"><strong>").append(quotation.getStatus()).append("</strong></td></tr>\n");
        if (quotation.getResponseNotes() != null && !quotation.getResponseNotes().trim().isEmpty()) {
            body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Notes:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(quotation.getResponseNotes())).append("</td></tr>\n");
        }
        body.append("</table>\n");
        return buildCorporateEmail("Quotation Response: " + quotationNo, body.toString());
    }

    public String buildPoNotificationHtml(PurchaseOrder po, String eventType) {
        String poNo = po.getPoNumber() != null ? po.getPoNumber() : "PO-" + po.getId();
        StringBuilder body = new StringBuilder();
        body.append("<p>A client Purchase Order has a new update: <strong>").append(escapeHtml(eventType)).append("</strong></p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">PO Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(poNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Client Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(po.getQuotation() != null ? po.getQuotation().getClientName() : "N/A")).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">PO Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(po.getPoDate() != null ? po.getPoDate().toString() : "").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Amount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(po.getPoValue(), po.getCurrency())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Status:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(po.getStatus() != null ? po.getStatus().name() : "").append("</td></tr>\n");
        body.append("</table>\n");
        return buildCorporateEmail("Purchase Order Update: " + poNo, body.toString());
    }

    public String buildInvoiceNotificationHtml(Invoice invoice, String eventType) {
        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV-" + invoice.getId();
        StringBuilder body = new StringBuilder();
        body.append("<p>An invoice update occurred: <strong>").append(escapeHtml(eventType)).append("</strong></p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Invoice Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(invoiceNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Client Name:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(invoice.getClientName())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Amount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(invoice.getGrandTotal(), invoice.getCurrency())).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Status:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(invoice.getStatus() != null ? invoice.getStatus().name() : "").append("</td></tr>\n");
        body.append("</table>\n");
        return buildCorporateEmail("Invoice Update: " + invoiceNo, body.toString());
    }

    public String buildInvoiceOverdueHtml(Invoice invoice) {
        String invoiceNo = invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "INV-" + invoice.getId();
        String customerName = invoice.getClientName() != null ? invoice.getClientName() : "Valued Customer";
        BigDecimal balanceDue = invoice.getGrandTotal().subtract(invoice.getAmountPaid() != null ? invoice.getAmountPaid() : BigDecimal.ZERO);
        
        StringBuilder body = new StringBuilder();
        body.append("<p>Dear <strong>").append(escapeHtml(customerName)).append("</strong>,</p>\n");
        body.append("<p>This is a polite reminder that the following invoice is now overdue.</p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Invoice Number:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(invoiceNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Due Date:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0; color:#DC2626;\">").append(invoice.getDueDate() != null ? invoice.getDueDate().toString() : "N/A").append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Outstanding Amount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(balanceDue, invoice.getCurrency())).append("</td></tr>\n");
        body.append("</table>\n");
        body.append("<p>If you have already arranged payment, please disregard this notice.</p>");
        return buildCorporateEmail("Invoice Overdue: " + invoiceNo, body.toString());
    }

    public String buildPaymentNotificationHtml(Payment payment, String eventType) {
        String paymentRef = payment.getPaymentNumber() != null ? payment.getPaymentNumber() : "PAY-" + payment.getId();
        String invoiceNo = (payment.getInvoice() != null && payment.getInvoice().getInvoiceNumber() != null) ? payment.getInvoice().getInvoiceNumber() : "N/A";
        
        StringBuilder body = new StringBuilder();
        body.append("<p>A payment has been recorded: <strong>").append(escapeHtml(eventType)).append("</strong></p>\n");
        body.append("<table style=\"width:100%; border-collapse:collapse; margin:20px 0; background-color:#F8FAFC; border:1px solid #E2E8F0;\">\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Payment Ref:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(paymentRef)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Invoice No:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(escapeHtml(invoiceNo)).append("</td></tr>\n");
        body.append("  <tr><td style=\"padding:10px; font-weight:600; border-bottom:1px solid #E2E8F0;\">Amount:</td><td style=\"padding:10px; border-bottom:1px solid #E2E8F0;\">").append(CurrencyUtils.formatCurrency(payment.getAmount(), payment.getCurrency())).append("</td></tr>\n");
        body.append("</table>\n");
        return buildCorporateEmail("Payment Notification: " + paymentRef, body.toString());
    }

    public String buildPasswordResetHtml(String resetLink) {
        StringBuilder body = new StringBuilder();
        body.append("<p>Someone requested a password reset for your account.</p>\n");
        body.append("<p>If you did not request this password reset, you can safely ignore this email.</p>\n");
        body.append("<p style=\"margin-top: 20px; margin-bottom: 20px;\">This link expires in 15 minutes.</p>\n");
        return buildCorporateEmail("Reset your ACROVIX password", body.toString(), "Reset Password", resetLink);
    }

    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
