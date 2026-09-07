package com.acrovix.backend.service;

import com.acrovix.backend.entity.Enquiry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${acrovix.mail.from-email:sweta@acrovix.com}")
    private String fromEmail;

    @Value("${acrovix.mail.from-name:ACROVIX}")
    private String fromName;

    @Value("${acrovix.mail.notification-email:sweta@acrovix.com}")
    private String notificationEmail;

    @Value("${acrovix.mail.asset-base-url:https://acrovix.com/email-assets}")
    private String assetBaseUrl;

    @Value("${acrovix.mail.brevo-api-key:}")
    private String brevoApiKey;

    public void sendCustomerAcknowledgement(Enquiry enquiry) {
        String subject = "Thank You for Contacting ACROVIX - " + enquiry.getReferenceId();
        String htmlBody = buildSharedEmailTemplate(enquiry, false);
        sendHtmlEmail(enquiry.getBusinessEmail(), subject, htmlBody);
    }

    public void sendInternalNotification(Enquiry enquiry) {
        String subject = "New Enquiry Received - " + enquiry.getReferenceId();
        String htmlBody = buildSharedEmailTemplate(enquiry, true);
        sendHtmlEmail(notificationEmail, subject, htmlBody);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            Map<String, Object> body = Map.of(
                "sender", Map.of("email", fromEmail, "name", fromName),
                "to", List.of(Map.of("email", to)),
                "subject", subject,
                "htmlContent", htmlBody
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForEntity("https://api.brevo.com/v3/smtp/email", request, String.class);
            
            logger.info("Successfully sent email request to: {}", to);
        } catch (Exception e) {
            logger.error("Failed to send email to: {}", to, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }

    private String buildSharedEmailTemplate(Enquiry enquiry, boolean isAdmin) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
        String formattedDate = enquiry.getCreatedAt() != null ? enquiry.getCreatedAt().format(formatter) : "N/A";
        
        String logoUrl = assetBaseUrl + "/logo.png";
        String heroArtwork = assetBaseUrl + "/hero-artwork.png";
        
        String iconSync = assetBaseUrl + "/sync.png";
        String iconScale = assetBaseUrl + "/scale.png";
        String iconSucceed = assetBaseUrl + "/succeed.png";
        
        String iconEnvelope = assetBaseUrl + "/envelope.png";
        String iconReview = assetBaseUrl + "/review.png";
        String iconConnect = assetBaseUrl + "/connect.png";
        String iconForward = assetBaseUrl + "/forward.png";
        
        String iconPhone = assetBaseUrl + "/phone.png";
        String iconEmail = assetBaseUrl + "/email.png";
        String iconLocation = assetBaseUrl + "/location.png";
        
        String iconLinkedin = assetBaseUrl + "/linkedin.png";
        String iconTwitter = assetBaseUrl + "/twitter.png";
        String iconInstagram = assetBaseUrl + "/instagram.png";
        String iconYoutube = assetBaseUrl + "/youtube.png";

        String heroLabel = isAdmin ? "NEW ENQUIRY" : "THANK YOU";
        String heroTitleLine1 = isAdmin ? "A New Enquiry Needs" : "Your Enquiry";
        String heroTitleLine2 = isAdmin ? "Review!" : "Has Been Received!";
        
        String heroSupportText = isAdmin 
            ? "A new business enquiry has been received<br>through the ACROVIX website.<br>Please review the enquiry details below." 
            : "We appreciate your interest in Acrovix.<br>Our team will review your enquiry and get<br>back to you shortly.";
            
        String greetingName = isAdmin ? "Team" : (enquiry.getFullName() != null ? enquiry.getFullName() : "Customer");
        
        String mainText = isAdmin
            ? "A new project requirement has been submitted. Please review the details below."
            : "Thank you for reaching out to Acrovix Innovations Private Limited.<br>We have successfully received your enquiry and our team will review it shortly.<br>We will get back to you within <strong style=\"color: #008b8b;\">24 hours</strong>.";

        StringBuilder detailsRows = new StringBuilder();
        detailsRows.append(buildDetailRow("Reference ID", enquiry.getReferenceId()));
        detailsRows.append(buildDetailRow("Date & Time", formattedDate));
        detailsRows.append(buildDetailRow("Full Name", enquiry.getFullName()));
        detailsRows.append(buildDetailRow("Business Email", enquiry.getBusinessEmail()));
        detailsRows.append(buildDetailRow("Company", enquiry.getCompanyName()));
        detailsRows.append(buildDetailRow("Phone Number", enquiry.getPhoneNumber()));
        detailsRows.append(buildDetailRow("Industry Sector", enquiry.getIndustrySector()));
        detailsRows.append(buildDetailRow("Service Required", enquiry.getServiceRequired()));
        detailsRows.append(buildDetailRow("Preferred Contact", enquiry.getPreferredContactMethod()));
        detailsRows.append(buildDetailRow("Project Requirement", enquiry.getProjectRequirement()));

        return """
        <!DOCTYPE html>
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="x-apple-disable-message-reformatting">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <title>Acrovix Enquiry</title>
            <!--[if mso]>
            <noscript>
            <xml>
                <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
            </noscript>
            <![endif]-->
            <style>
                table, td, div, h1, p { font-family: Arial, Helvetica, sans-serif; }
                body { margin: 0; padding: 0; word-spacing: normal; background-color: #f4f7f6; -webkit-text-size-adjust: 100%%; -ms-text-size-adjust: 100%%; }
                table { border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; }
                td { padding: 0; }
                a { text-decoration: none; color: #008b8b; }
                .email-container { width: 100%%; max-width: 640px; margin: 0 auto; background-color: #ffffff; }
                .text-wrap { word-break: break-word; overflow-wrap: break-word; }
                .light-force { background-color: #ffffff !important; color: #0f172a !important; }
                .navy-force { background-color: #0B1B36 !important; color: #ffffff !important; }
                
                @media screen and (max-width: 600px) {
                    .stack-mobile { display: block !important; width: 100%% !important; max-width: 100%% !important; direction: ltr !important; }
                    .center-mobile { text-align: center !important; }
                    .pad-mobile { padding: 20px !important; }
                    .hide-mobile { display: none !important; }
                    .hero-img { width: 100%% !important; height: auto !important; }
                    .contact-border { border-left: none !important; border-right: none !important; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; padding: 15px 0 !important; }
                    .contact-col { padding: 10px 0 !important; }
                }
            </style>
        </head>
        <body style="margin:0;padding:0;word-spacing:normal;background-color:#f4f7f6;">
            <div role="article" aria-roledescription="email" lang="en" style="text-size-adjust:100%%;-webkit-text-size-adjust:100%%;-ms-text-size-adjust:100%%;background-color:#f4f7f6;padding:20px 0;">
                <!--[if mso]>
                <table role="presentation" align="center" style="width:640px;"><tr><td style="padding:0;">
                <![endif]-->
                <table class="email-container light-force" role="presentation" style="width:100%%;max-width:640px;margin:0 auto;background-color:#ffffff;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
                    
                    <!-- HEADER -->
                    <tr>
                        <td class="pad-mobile" style="padding:30px 40px;background-color:#ffffff;">
                            <table role="presentation" style="width:100%%;">
                                <tr>
                                    <td class="stack-mobile center-mobile" style="width:50%%;text-align:left;vertical-align:middle;">
                                        <a href="https://acrovix.com"><img src="%s" alt="ACROVIX" width="180" style="display:inline-block;max-width:100%%;height:auto;border:0;"></a>
                                    </td>
                                    <td class="stack-mobile center-mobile" style="width:50%%;text-align:right;vertical-align:middle;">
                                        <table role="presentation" style="display:inline-block;">
                                            <tr>
                                                <!-- We embed the icons directly -->
                                                <td style="padding-right:15px;border-right:1px solid #e2e8f0;"><img src="%s" alt="SYNC" height="20" style="display:block;height:20px;width:auto;"></td>
                                                <td style="padding:0 15px;border-right:1px solid #e2e8f0;"><img src="%s" alt="SCALE" height="20" style="display:block;height:20px;width:auto;"></td>
                                                <td style="padding-left:15px;"><img src="%s" alt="SUCCEED" height="20" style="display:block;height:20px;width:auto;"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- HERO -->
                    <tr>
                        <td style="background-color:#F0F8FF;background-image:url('%s');background-position:right bottom;background-repeat:no-repeat;background-size:cover;">
                            <!--[if mso]>
                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:640px;height:300px;">
                            <v:fill type="frame" src="%s" color="#F0F8FF" />
                            <v:textbox inset="0,0,0,0">
                            <![endif]-->
                            <table role="presentation" style="width:100%%;">
                                <tr>
                                    <td class="stack-mobile pad-mobile" style="width:100%%;padding:50px 40px;">
                                        <div style="margin-bottom:15px;">
                                            <span style="font-size:10px;font-weight:700;letter-spacing:2px;color:#475569;text-transform:uppercase;">%s</span>
                                            <span style="display:inline-block;width:30px;border-bottom:2px solid #008b8b;margin-left:10px;vertical-align:middle;"></span>
                                        </div>
                                        <h1 style="margin:0 0 15px 0;font-size:32px;color:#0f172a;line-height:1.2;font-family:Arial,sans-serif;">
                                            %s<br>
                                            <span style="color:#008b8b;">%s</span>
                                        </h1>
                                        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
                                            %s
                                        </p>
                                    </td>
                                    <td class="hide-mobile" style="width:40%%;">
                                        <!-- Spacer for desktop to force text to the left side since background image is on the right -->
                                        &nbsp;
                                    </td>
                                </tr>
                            </table>
                            <!--[if mso]>
                            </v:textbox>
                            </v:rect>
                            <![endif]-->
                        </td>
                    </tr>
                    
                    <!-- MAIN CONTENT -->
                    <tr>
                        <td class="pad-mobile" style="padding:40px;background-color:#ffffff;">
                            <h2 style="margin:0 0 15px 0;font-size:16px;color:#0f172a;font-family:Arial,sans-serif;">Hi %s,</h2>
                            <p style="margin:0 0 30px 0;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
                                %s
                            </p>
                            
                            <!-- ENQUIRY CARD -->
                            <table role="presentation" style="width:100%%;background-color:#F0F8FF;border-radius:12px;overflow:hidden;">
                                <tr>
                                    <td class="stack-mobile center-mobile" style="width:20%%;padding:30px 20px;border-right:1px solid #e2e8f0;background-color:#F0F8FF;">
                                        <img src="%s" alt="Details" width="56" style="display:inline-block;border:0;">
                                    </td>
                                    <td class="stack-mobile pad-mobile" style="width:80%%;padding:30px;background-color:#F0F8FF;">
                                        <div style="font-size:11px;font-weight:bold;color:#008b8b;margin-bottom:15px;letter-spacing:1px;font-family:Arial,sans-serif;">ENQUIRY DETAILS</div>
                                        <table role="presentation" style="width:100%%;">
                                            %s
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- WHAT HAPPENS NEXT -->
                    <tr>
                        <td class="pad-mobile" style="padding:10px 40px 40px 40px;background-color:#ffffff;">
                            <h3 style="margin:0 0 25px 0;font-size:18px;color:#0f172a;font-family:Arial,sans-serif;">What Happens Next?</h3>
                            
                            <table role="presentation" style="width:100%%;">
                                <style>
                                    /* Inline style specifically for this block just in case */
                                    @media screen and (max-width: 600px) {
                                        .show-mobile-block { display: block !important; max-height: none !important; overflow: visible !important; }
                                    }
                                </style>
                                <tr>
                                    <td class="stack-mobile center-mobile" style="width:30%%;vertical-align:top;padding-bottom:5px;">
                                        <img src="%s" alt="Review" width="48" style="display:inline-block;margin-bottom:10px;border:0;">
                                        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;font-family:Arial,sans-serif;">01<br>Review</div>
                                        <div style="font-size:11px;color:#64748b;line-height:1.4;font-family:Arial,sans-serif;">Our team reviews your<br>enquiry and requirement.</div>
                                    </td>
                                    
                                    <!-- Desktop Arrow -->
                                    <td class="hide-mobile" style="width:5%%;text-align:center;vertical-align:top;padding-top:20px;color:#008b8b;font-size:16px;">&#10095;</td>
                                    
                                    <!-- Mobile Vertical Dots -->
                                    <td class="stack-mobile center-mobile" style="width:100%%;padding:10px 0;">
                                        <!--[if !mso]><!-->
                                        <div class="show-mobile-block" style="display:none; max-height:0; overflow:hidden; text-align:center; color:#008b8b; font-size:14px; letter-spacing:2px; line-height:1;">
                                            &#8942;
                                        </div>
                                        <!--<![endif]-->
                                    </td>

                                    <td class="stack-mobile center-mobile" style="width:30%%;vertical-align:top;padding-bottom:5px;">
                                        <img src="%s" alt="Connect" width="48" style="display:inline-block;margin-bottom:10px;border:0;">
                                        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;font-family:Arial,sans-serif;">02<br>Connect</div>
                                        <div style="font-size:11px;color:#64748b;line-height:1.4;font-family:Arial,sans-serif;">Our team connects with you<br>to understand your needs.</div>
                                    </td>
                                    
                                    <!-- Desktop Arrow -->
                                    <td class="hide-mobile" style="width:5%%;text-align:center;vertical-align:top;padding-top:20px;color:#008b8b;font-size:16px;">&#10095;</td>
                                    
                                    <!-- Mobile Vertical Dots -->
                                    <td class="stack-mobile center-mobile" style="width:100%%;padding:10px 0;">
                                        <!--[if !mso]><!-->
                                        <div class="show-mobile-block" style="display:none; max-height:0; overflow:hidden; text-align:center; color:#008b8b; font-size:14px; letter-spacing:2px; line-height:1;">
                                            &#8942;
                                        </div>
                                        <!--<![endif]-->
                                    </td>

                                    <td class="stack-mobile center-mobile" style="width:30%%;vertical-align:top;">
                                        <img src="%s" alt="Move Forward" width="48" style="display:inline-block;margin-bottom:10px;border:0;">
                                        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;font-family:Arial,sans-serif;">03<br>Move Forward</div>
                                        <div style="font-size:11px;color:#64748b;line-height:1.4;font-family:Arial,sans-serif;">We discuss the right<br>solution and next steps.</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin:25px 0;color:#64748b;font-size:13px;line-height:1.5;font-family:Arial,sans-serif;">
                                In the meantime, feel free to explore our website or reach out to us if you have any additional questions.
                            </p>
                            
                            <!-- CTA -->
                            <table role="presentation" style="margin:0;">
                                <tr>
                                    <td style="border-radius:4px;background-color:#008b8b;text-align:center;">
                                        <a href="https://acrovix.com" style="background-color:#008b8b;border:1px solid #008b8b;border-radius:4px;color:#ffffff;display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;mso-hide:all;">Visit Our Website &rarr;</a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- CONTACT ROW -->
                    <tr>
                        <td class="pad-mobile" style="padding:30px 40px;background-color:#ffffff;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
                            <table role="presentation" style="width:100%%;">
                                <tr>
                                    <td class="stack-mobile contact-col" style="width:33%%;vertical-align:middle;">
                                        <table role="presentation" style="margin:0 auto;"><tr>
                                            <td style="padding-right:12px;"><img src="%s" alt="Phone" width="30" style="display:block;border:0;"></td>
                                            <td>
                                                <a href="tel:+918660947415" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:12px;font-family:Arial,sans-serif;">+91-8660947415</a><br>
                                                <span style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">Call Us</span>
                                            </td>
                                        </tr></table>
                                    </td>
                                    <td class="stack-mobile contact-border contact-col" style="width:33%%;vertical-align:middle;border-left:1px solid #cbd5e1;border-right:1px solid #cbd5e1;">
                                        <table role="presentation" style="margin:0 auto;"><tr>
                                            <td style="padding-right:12px;"><img src="%s" alt="Email" width="30" style="display:block;border:0;"></td>
                                            <td>
                                                <a href="mailto:sweta@acrovix.com" class="text-wrap" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:12px;font-family:Arial,sans-serif;">sweta@acrovix.com</a><br>
                                                <span style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">Email Us</span>
                                            </td>
                                        </tr></table>
                                    </td>
                                    <td class="stack-mobile contact-col" style="width:33%%;vertical-align:middle;">
                                        <table role="presentation" style="margin:0 auto;"><tr>
                                            <td style="padding-right:12px;"><img src="%s" alt="Location" width="30" style="display:block;border:0;"></td>
                                            <td>
                                                <span style="color:#0f172a;font-weight:bold;font-size:12px;font-family:Arial,sans-serif;">Bengaluru | Bihar</span><br>
                                                <span style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">Our Offices</span>
                                            </td>
                                        </tr></table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td class="pad-mobile navy-force" style="padding:40px;background-color:#0B1B36;color:#ffffff;">
                            <table role="presentation" style="width:100%%;">
                                <tr>
                                    <td class="stack-mobile center-mobile" style="width:40%%;vertical-align:middle;padding-bottom:20px;">
                                        <a href="https://acrovix.com"><img src="%s" alt="ACROVIX" width="160" style="display:inline-block;max-width:100%%;height:auto;border:0;"></a>
                                    </td>
                                    <td class="stack-mobile center-mobile" style="width:60%%;vertical-align:middle;text-align:right;">
                                        <p style="margin:0 0 15px 0;font-size:11px;color:#cbd5e1;font-family:Arial,sans-serif;">
                                            <a href="https://acrovix.com" style="color:#ffffff;text-decoration:none;">Home</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/about" style="color:#ffffff;text-decoration:none;">About</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/services" style="color:#ffffff;text-decoration:none;">Services</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/industries" style="color:#ffffff;text-decoration:none;">Industries</a><br><br>
                                            <a href="https://acrovix.com/products" style="color:#ffffff;text-decoration:none;">Products</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/contact" style="color:#ffffff;text-decoration:none;">Contact</a>
                                        </p>
                                        <table role="presentation" style="display:inline-block;"><tr>
                                            <td style="padding:0 5px;"><a href="#"><img src="%s" alt="LinkedIn" width="24" style="border:0;"></a></td>
                                            <td style="padding:0 5px;"><a href="#"><img src="%s" alt="Twitter" width="24" style="border:0;"></a></td>
                                            <td style="padding:0 5px;"><a href="#"><img src="%s" alt="Instagram" width="24" style="border:0;"></a></td>
                                            <td style="padding:0 5px;"><a href="#"><img src="%s" alt="YouTube" width="24" style="border:0;"></a></td>
                                        </tr></table>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" class="center-mobile" style="padding-top:25px;font-size:10px;color:#64748b;font-family:Arial,sans-serif;text-align:center;">
                                        &copy; 2026 Acrovix Innovations Private Limited. All rights reserved.
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
                <!--[if mso]>
                </td></tr></table>
                <![endif]-->
            </div>
        </body>
        </html>
        """.formatted(
            logoUrl, iconSync, iconScale, iconSucceed,
            heroArtwork, heroArtwork, heroLabel, heroTitleLine1, heroTitleLine2, heroSupportText,
            greetingName, mainText,
            iconEnvelope, detailsRows.toString(),
            iconReview, iconConnect, iconForward,
            iconPhone, iconEmail, iconLocation,
            logoUrl, iconLinkedin, iconTwitter, iconInstagram, iconYoutube
        );
    }
    
    private String buildDetailRow(String label, String value) {
        if (value == null || value.trim().isEmpty()) {
            value = "Not specified";
        }
        // Basic HTML escaping
        value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        return """
            <tr>
                <td style="padding:8px 0;color:#475569;font-size:13px;width:130px;font-family:Arial,sans-serif;vertical-align:top;">%s</td>
                <td style="padding:8px 10px 8px 0;color:#475569;font-size:13px;width:10px;font-family:Arial,sans-serif;vertical-align:top;">:</td>
                <td class="text-wrap" style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;font-family:Arial,sans-serif;vertical-align:top;">%s</td>
            </tr>
        """.formatted(label, value);
    }
}
