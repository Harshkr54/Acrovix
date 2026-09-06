package com.acrovix.backend.service;

import com.acrovix.backend.entity.Enquiry;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final JavaMailSender mailSender;

    @Value("${acrovix.mail.from-email:sweta@acrovix.com}")
    private String fromEmail;

    @Value("${acrovix.mail.from-name:ACROVIX}")
    private String fromName;

    @Value("${acrovix.mail.notification-email:sweta@acrovix.com}")
    private String notificationEmail;

    public void sendInternalNotification(Enquiry enquiry) {
        if (enquiry == null) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(fromEmail, fromName, "UTF-8"));
            helper.setTo(notificationEmail);
            helper.setSubject("New Enquiry Received - " + enquiry.getReferenceId());

            String htmlBody = buildInternalNotificationHtml(enquiry);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            logger.info("Internal notification email sent successfully for enquiry reference ID: {}", enquiry.getReferenceId());
        } catch (Exception e) {
            logger.error("Failed to send internal notification email for enquiry reference ID: {}", enquiry.getReferenceId(), e);
        }
    }

    public void sendCustomerAcknowledgement(Enquiry enquiry) {
        if (enquiry == null || enquiry.getBusinessEmail() == null || enquiry.getBusinessEmail().trim().isEmpty()) {
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(fromEmail, fromName, "UTF-8"));
            helper.setTo(enquiry.getBusinessEmail().trim());
            helper.setSubject("Thank You for Contacting ACROVIX - " + enquiry.getReferenceId());

            String htmlBody = buildCustomerAcknowledgementHtml(enquiry);
            helper.setText(htmlBody, true);

            mailSender.send(message);
            logger.info("Customer acknowledgement email sent successfully to {} for enquiry reference ID: {}", 
                    enquiry.getBusinessEmail(), enquiry.getReferenceId());
        } catch (Exception e) {
            logger.error("Failed to send customer acknowledgement email for enquiry reference ID: {}", enquiry.getReferenceId(), e);
        }
    }

    private String buildInternalNotificationHtml(Enquiry enquiry) {
        String formattedDate = enquiry.getCreatedAt() != null ? enquiry.getCreatedAt().format(DATE_FORMATTER) : "N/A";
        String industry = enquiry.getIndustrySector() != null ? enquiry.getIndustrySector() : "Not specified";
        String service = enquiry.getServiceRequired() != null ? enquiry.getServiceRequired() : "Not specified";
        String contactMethod = enquiry.getPreferredContactMethod() != null ? enquiry.getPreferredContactMethod() : "Email";

        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>New Enquiry Notification</title>
                </head>
                <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f1f5f9; padding: 20px; margin: 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #0f172a; padding: 20px; text-align: center; color: #ffffff;">
                            <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 1px;">ACROVIX INNOVATIONS</h2>
                            <p style="margin: 4px 0 0 0; font-size: 13px; color: #94a3b8;">New Project Enquiry Notification</p>
                        </div>
                        <div style="padding: 24px;">
                            <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 12px 16px; margin-bottom: 20px; border-radius: 0 4px 4px 0;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Reference ID</span>
                                <div style="font-size: 16px; font-weight: bold; color: #0f172a; font-family: monospace; margin-top: 2px;">%s</div>
                            </div>
                            
                            <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 0;">Contact Details</h3>
                            <table style="width: 100%%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
                                <tr><td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: bold;">Full Name:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Business Email:</td><td style="padding: 6px 0; color: #0f172a;"><a href="mailto:%s" style="color: #0d9488; text-decoration: none;">%s</a></td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Company:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Phone Number:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                            </table>

                            <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Project Requirement</h3>
                            <div style="background-color: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 14px; line-height: 1.6; color: #334155; white-space: pre-wrap; margin-bottom: 20px;">%s</div>

                            <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Additional Details</h3>
                            <table style="width: 100%%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
                                <tr><td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: bold;">Industry Sector:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Service Required:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Preferred Contact:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Submission Time:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                            </table>
                        </div>
                        <div style="background-color: #f1f5f9; padding: 12px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                            ACROVIX INNOVATIONS PRIVATE LIMITED &bull; Internal System Notification
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                escapeHtml(enquiry.getReferenceId()),
                escapeHtml(enquiry.getFullName()),
                escapeHtml(enquiry.getBusinessEmail()),
                escapeHtml(enquiry.getBusinessEmail()),
                escapeHtml(enquiry.getCompanyName()),
                escapeHtml(enquiry.getPhoneNumber()),
                escapeHtml(enquiry.getProjectRequirement()),
                escapeHtml(industry),
                escapeHtml(service),
                escapeHtml(contactMethod),
                formattedDate
        );
    }

    private String buildCustomerAcknowledgementHtml(Enquiry enquiry) {
        String industry = enquiry.getIndustrySector() != null ? enquiry.getIndustrySector() : "Not specified";
        String service = enquiry.getServiceRequired() != null ? enquiry.getServiceRequired() : "Not specified";

        return """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Thank You for Contacting ACROVIX</title>
                </head>
                <body style="font-family: Arial, sans-serif; color: #1e293b; background-color: #f1f5f9; padding: 20px; margin: 0;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #0f172a; padding: 24px; text-align: center; color: #ffffff;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 1px;">ACROVIX INNOVATIONS</h1>
                            <p style="margin: 6px 0 0 0; font-size: 13px; color: #0d9488; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Enterprise Technology & Infrastructure Solutions</p>
                        </div>
                        <div style="padding: 28px;">
                            <p style="font-size: 15px; line-height: 1.6; margin-top: 0;">Dear <strong>%s</strong>,</p>
                            
                            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                                Thank you for reaching out to <strong>ACROVIX INNOVATIONS PRIVATE LIMITED</strong>. We have received your project requirement and our technical architecture team is currently reviewing your submission.
                            </p>

                            <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0;">
                                <span style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Your Enquiry Reference ID</span>
                                <div style="font-size: 18px; font-weight: bold; color: #0d9488; font-family: monospace; margin-top: 2px;">%s</div>
                            </div>

                            <h3 style="font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">Submission Summary</h3>
                            <table style="width: 100%%; font-size: 14px; border-collapse: collapse; margin-bottom: 20px;">
                                <tr><td style="padding: 6px 0; color: #64748b; width: 140px; font-weight: bold;">Company:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Industry Sector:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                                <tr><td style="padding: 6px 0; color: #64748b; font-weight: bold;">Service Required:</td><td style="padding: 6px 0; color: #0f172a;">%s</td></tr>
                            </table>

                            <p style="font-size: 14px; line-height: 1.6; color: #334155;">
                                One of our enterprise specialists will contact you shortly using your preferred communication channel to discuss your requirements in detail.
                            </p>

                            <p style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 0;">
                                Best regards,<br>
                                <strong>Enterprise Engineering Team</strong><br>
                                <span style="color: #64748b; font-size: 13px;">ACROVIX INNOVATIONS PRIVATE LIMITED</span>
                            </p>
                        </div>
                        <div style="background-color: #f1f5f9; padding: 16px 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0;">
                            &copy; ACROVIX INNOVATIONS PRIVATE LIMITED &bull; All Rights Reserved.<br>
                            This is an automated confirmation email for reference ID %s.
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(
                escapeHtml(enquiry.getFullName()),
                escapeHtml(enquiry.getReferenceId()),
                escapeHtml(enquiry.getCompanyName()),
                escapeHtml(industry),
                escapeHtml(service),
                escapeHtml(enquiry.getReferenceId())
        );
    }

    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
