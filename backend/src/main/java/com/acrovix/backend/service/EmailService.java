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

    @Value("${acrovix.mail.from-email:sales@acrovix.com}")
    private String fromEmail;

    @Value("${acrovix.mail.from-name:ACROVIX}")
    private String fromName;

    @Value("${acrovix.mail.notification-email:sales@acrovix.com}")
    private String notificationEmail;

    @Value("${acrovix.mail.asset-base-url:https://acrovix.com/email-assets}")
    private String assetBaseUrl;

    @Value("${brevo.api-key:}")
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
        
        String logoUrl = assetBaseUrl + "/Acrovix_logo.png";
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
        <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <meta name="x-apple-disable-message-reformatting">
            <meta name="color-scheme" content="light">
            <meta name="supported-color-schemes" content="light">
            <title>Acrovix Enquiry</title>
            <!--[if mso]>
            <xml>
                <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
                </o:OfficeDocumentSettings>
            </xml>
            <style>
                table {border-collapse: collapse;}
            </style>
            <![endif]-->
            <style>
                table, td, div, h1, p, a, span { font-family: Arial, Helvetica, sans-serif; }
                body { margin: 0; padding: 0; word-spacing: normal; background-color: #f4f7f6; -webkit-text-size-adjust: 100%%; -ms-text-size-adjust: 100%%; }
                table { border-collapse: collapse; border-spacing: 0; margin: 0; padding: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                td { padding: 0; }
                img { border: 0; line-height: 100%%; outline: none; text-decoration: none; display: block; }
                a { text-decoration: none; color: #008b8b; }
                
                .email-container { width: 100%%; max-width: 600px; margin: 0 auto; background-color: #ffffff; }
                
                .light-force { background-color: #ffffff !important; color: #0f172a !important; }
                .navy-force { background-color: #0B1B36 !important; color: #ffffff !important; }
                
                @media screen and (max-width: 600px) {
                    .mobile-full { display: block !important; width: 100%% !important; max-width: 100%% !important; box-sizing: border-box !important; }
                    .mobile-center { text-align: center !important; }
                    .mobile-pad { padding: 20px !important; }
                    .mobile-pad-bottom { padding-bottom: 20px !important; }
                    .mobile-pad-top { padding-top: 20px !important; }
                    .mobile-hide { display: none !important; width: 0 !important; height: 0 !important; overflow: hidden !important; padding: 0 !important; }
                    .mobile-show { display: block !important; max-height: none !important; overflow: visible !important; }
                    .mobile-border-none { border: none !important; }
                    .mobile-border-bottom { border-bottom: 1px solid #cbd5e1 !important; }
                    .mobile-img-full { width: 100%% !important; height: auto !important; }
                }
            </style>
        </head>
        <body style="margin:0;padding:0;word-spacing:normal;background-color:#f4f7f6;">
            <div role="article" aria-roledescription="email" lang="en" style="text-size-adjust:100%%;-webkit-text-size-adjust:100%%;-ms-text-size-adjust:100%%;background-color:#f4f7f6;padding:20px 0;">
                <!--[if mso]>
                <table role="presentation" align="center" width="600" style="width:600px;background-color:#ffffff;"><tr><td style="padding:0;">
                <![endif]-->
                <table class="email-container light-force" role="presentation" width="600" style="width:100%%;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e2e8f0;">
                    
                    <!-- HEADER -->
                    <tr>
                        <td style="padding:30px 40px;background-color:#ffffff;" class="mobile-pad">
                            <table role="presentation" width="100%%" style="width:100%%;">
                                <tr>
                                    <!-- LEFT: Logo -->
                                    <td class="mobile-full mobile-center mobile-pad-bottom" width="260" style="width:50%%;text-align:left;vertical-align:middle;">
                                        <a href="https://acrovix.com"><img src="%s" alt="ACROVIX" width="180" style="max-width:100%%;height:auto;"></a>
                                    </td>
                                    <!-- RIGHT: Icons -->
                                    <td class="mobile-full mobile-center" width="260" style="width:50%%;text-align:right;vertical-align:middle;">
                                        <table role="presentation" align="right" style="margin-left:auto;margin-right:0;" class="mobile-center">
                                            <tr>
                                                <td style="padding-right:15px;border-right:1px solid #e2e8f0;line-height:20px;"><img src="%s" alt="SYNC" height="20" style="height:20px;width:auto;display:block;"></td>
                                                <td style="padding:0 15px;border-right:1px solid #e2e8f0;line-height:20px;"><img src="%s" alt="SCALE" height="20" style="height:20px;width:auto;display:block;"></td>
                                                <td style="padding-left:15px;line-height:20px;"><img src="%s" alt="SUCCEED" height="20" style="height:20px;width:auto;display:block;"></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- HERO SECTION (Real Table, 2 Columns) -->
                    <tr>
                        <td style="background-color:#F0F8FF;">
                            <table role="presentation" width="100%%" style="width:100%%;">
                                <tr>
                                    <!-- LEFT: Text Column -->
                                    <td class="mobile-full mobile-center" width="300" style="width:300px;padding:40px 0 40px 40px;" valign="middle">
                                        <div style="margin-bottom:15px;" class="mobile-center">
                                            <span style="font-size:10px;font-weight:700;letter-spacing:2px;color:#475569;text-transform:uppercase;">%s</span>
                                            <span style="display:inline-block;width:30px;height:2px;background-color:#008b8b;margin-left:10px;vertical-align:middle;"></span>
                                        </div>
                                        <h1 style="margin:0 0 15px 0;font-size:32px;color:#0f172a;line-height:1.2;font-family:Arial,sans-serif;" class="mobile-center">
                                            %s<br>
                                            <span style="color:#008b8b;">%s</span>
                                        </h1>
                                        <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;" class="mobile-center">
                                            %s
                                        </p>
                                    </td>
                                    <!-- RIGHT: Artwork Column -->
                                    <td class="mobile-full mobile-center" width="300" style="width:300px;vertical-align:bottom;text-align:right;" valign="bottom" align="right">
                                        <img src="%s" alt="Hero Artwork" width="300" style="display:block;width:100%%;max-width:300px;height:auto;margin:0 0 0 auto;" class="mobile-img-full">
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- MAIN CONTENT / INTRO -->
                    <tr>
                        <td style="padding:40px 40px 0 40px;background-color:#ffffff;" class="mobile-pad">
                            <h2 style="margin:0 0 15px 0;font-size:16px;color:#0f172a;font-family:Arial,sans-serif;">Hi %s,</h2>
                            <p style="margin:0 0 30px 0;color:#475569;font-size:14px;line-height:1.6;font-family:Arial,sans-serif;">
                                %s
                            </p>
                        </td>
                    </tr>
                    
                    <!-- ENQUIRY DETAILS CARD -->
                    <tr>
                        <td style="padding:0 40px 40px 40px;background-color:#ffffff;" class="mobile-pad">
                            <table role="presentation" width="100%%" style="width:100%%;background-color:#F0F8FF;border:1px solid #e2e8f0;border-radius:12px;">
                                <tr>
                                    <!-- LEFT ICON COLUMN -->
                                    <td class="mobile-full mobile-center mobile-border-bottom" width="80" style="width:80px;padding:30px 10px;border-right:1px solid #e2e8f0;background-color:#F0F8FF;" valign="middle" align="center">
                                        <img src="%s" alt="Details" width="50" style="display:inline-block;margin:0 auto;">
                                    </td>
                                    <!-- RIGHT DATA COLUMN -->
                                    <td class="mobile-full" style="padding:30px;background-color:#F0F8FF;" valign="top">
                                        <div style="font-size:11px;font-weight:bold;color:#008b8b;margin-bottom:15px;letter-spacing:1px;font-family:Arial,sans-serif;">ENQUIRY DETAILS</div>
                                        <table role="presentation" width="100%%" style="width:100%%;">
                                            %s
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- WHAT HAPPENS NEXT -->
                    <tr>
                        <td style="padding:10px 40px 40px 40px;background-color:#ffffff;" class="mobile-pad">
                            <h3 style="margin:0 0 25px 0;font-size:18px;color:#0f172a;font-family:Arial,sans-serif;">What Happens Next?</h3>
                            
                            <!-- 5 Column Layout with Explicit Pixel Widths for Desktop -->
                            <table role="presentation" width="100%%" style="width:100%%;table-layout:fixed;">
                                <tr>
                                    <!-- STEP 1 -->
                                    <td class="mobile-full mobile-center mobile-pad-bottom" width="170" style="width:170px;vertical-align:top;" valign="top">
                                        <img src="%s" alt="Review" width="48" style="display:inline-block;margin-bottom:10px;">
                                        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;font-family:Arial,sans-serif;">01<br>Review</div>
                                        <div style="font-size:11px;color:#64748b;line-height:1.4;font-family:Arial,sans-serif;">Our team reviews your<br>enquiry and requirement.</div>
                                    </td>
                                    
                                    <!-- ARROW 1 -->
                                    <td class="mobile-hide" width="45" style="width:45px;text-align:center;vertical-align:top;padding-top:20px;color:#008b8b;font-size:16px;" valign="top" align="center">&#10095;</td>
                                    
                                    <!-- Mobile Vertical Spacer 1 (Hidden on Desktop) -->
                                    <!--[if !mso]><!-->
                                    <td class="mobile-show mobile-full mobile-center" style="display:none;width:100%%;padding:10px 0;color:#008b8b;font-size:14px;letter-spacing:2px;line-height:1;text-align:center;">
                                        &#8942;
                                    </td>
                                    <!--<![endif]-->

                                    <!-- STEP 2 -->
                                    <td class="mobile-full mobile-center mobile-pad-bottom" width="170" style="width:170px;vertical-align:top;" valign="top">
                                        <img src="%s" alt="Connect" width="48" style="display:inline-block;margin-bottom:10px;">
                                        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;font-family:Arial,sans-serif;">02<br>Connect</div>
                                        <div style="font-size:11px;color:#64748b;line-height:1.4;font-family:Arial,sans-serif;">Our team connects with you<br>to understand your needs.</div>
                                    </td>
                                    
                                    <!-- ARROW 2 -->
                                    <td class="mobile-hide" width="45" style="width:45px;text-align:center;vertical-align:top;padding-top:20px;color:#008b8b;font-size:16px;" valign="top" align="center">&#10095;</td>
                                    
                                    <!-- Mobile Vertical Spacer 2 (Hidden on Desktop) -->
                                    <!--[if !mso]><!-->
                                    <td class="mobile-show mobile-full mobile-center" style="display:none;width:100%%;padding:10px 0;color:#008b8b;font-size:14px;letter-spacing:2px;line-height:1;text-align:center;">
                                        &#8942;
                                    </td>
                                    <!--<![endif]-->

                                    <!-- STEP 3 -->
                                    <td class="mobile-full mobile-center" width="170" style="width:170px;vertical-align:top;" valign="top">
                                        <img src="%s" alt="Move Forward" width="48" style="display:inline-block;margin-bottom:10px;">
                                        <div style="font-size:13px;font-weight:bold;color:#0f172a;margin-bottom:4px;font-family:Arial,sans-serif;">03<br>Move Forward</div>
                                        <div style="font-size:11px;color:#64748b;line-height:1.4;font-family:Arial,sans-serif;">We discuss the right<br>solution and next steps.</div>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin:25px 0;color:#64748b;font-size:13px;line-height:1.5;font-family:Arial,sans-serif;">
                                In the meantime, feel free to explore our website or reach out to us if you have any additional questions.
                            </p>
                            
                            <!-- CTA BUTTON -->
                            <table role="presentation" style="margin:0;">
                                <tr>
                                    <td style="border-radius:4px;background-color:#008b8b;text-align:center;">
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://acrovix.com" style="height:44px;v-text-anchor:middle;width:200px;" arcsize="10%%" stroke="f" fillcolor="#008b8b">
                                        <w:anchorlock/>
                                        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Visit Our Website &rarr;</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <a href="https://acrovix.com" style="background-color:#008b8b;border-radius:4px;color:#ffffff;display:inline-block;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:200px;-webkit-text-size-adjust:none;">Visit Our Website &rarr;</a>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- CONTACT INFO ROW -->
                    <tr>
                        <td style="padding:30px 40px;background-color:#ffffff;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;" class="mobile-pad">
                            <!-- 3 Column Layout -->
                            <table role="presentation" width="100%%" style="width:100%%;">
                                <tr>
                                    <!-- Phone -->
                                    <td class="mobile-full mobile-pad-bottom" width="170" style="width:33%%;vertical-align:middle;" valign="middle">
                                        <table role="presentation" style="margin:0;">
                                            <tr>
                                                <td style="padding-right:12px;"><img src="%s" alt="Phone" width="30" style="display:block;"></td>
                                                <td>
                                                    <a href="tel:+918660947415" style="color:#0f172a;text-decoration:none;font-weight:bold;font-size:12px;font-family:Arial,sans-serif;">+91-8660947415</a><br>
                                                    <span style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">Call Us</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    
                                    <!-- Email -->
                                    <td class="mobile-full mobile-pad-bottom" width="170" style="width:33%%;vertical-align:middle;" valign="middle">
                                        <table role="presentation" style="margin:0;">
                                            <tr>
                                                <td style="padding-right:12px;"><img src="%s" alt="Email" width="30" style="display:block;"></td>
                                                <td>
                                                    <a href="mailto:sales@acrovix.com" target="_blank" rel="noopener noreferrer" style="word-break:break-word;color:#0f172a;text-decoration:none;font-weight:bold;font-size:12px;font-family:Arial,sans-serif;">sales@acrovix.com</a><br>
                                                    <span style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">Email Us</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    
                                    <!-- Location -->
                                    <td class="mobile-full" width="170" style="width:33%%;vertical-align:middle;" valign="middle">
                                        <table role="presentation" style="margin:0;">
                                            <tr>
                                                <td style="padding-right:12px;"><img src="%s" alt="Location" width="30" style="display:block;"></td>
                                                <td>
                                                    <span style="color:#0f172a;font-weight:bold;font-size:12px;font-family:Arial,sans-serif;">Bengaluru | Bihar</span><br>
                                                    <span style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;">Our Offices</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- FOOTER -->
                    <tr>
                        <td class="navy-force mobile-pad" style="padding:40px;background-color:#0B1B36;color:#ffffff;">
                            <table role="presentation" width="100%%" style="width:100%%;">
                                <tr>
                                    <!-- LEFT: Logo -->
                                    <td class="mobile-full mobile-center mobile-pad-bottom" width="200" style="width:40%%;vertical-align:middle;" valign="middle">
                                        <table role="presentation" style="margin:0;background-color:#F7FCFA;border-radius:12px;" class="mobile-center">
                                            <tr>
                                                <td style="padding:10px 14px;text-align:center;">
                                                    <a href="https://acrovix.com"><img src="%s" alt="ACROVIX" width="160" style="max-width:100%%;height:auto;display:block;margin:0 auto;"></a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <!-- RIGHT: Links & Socials -->
                                    <td class="mobile-full mobile-center" width="300" style="width:60%%;vertical-align:middle;text-align:right;" valign="middle" align="right">
                                        <p style="margin:0 0 15px 0;font-size:11px;color:#cbd5e1;font-family:Arial,sans-serif;line-height:1.6;">
                                            <a href="https://acrovix.com" style="color:#ffffff;text-decoration:none;">Home</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/about" style="color:#ffffff;text-decoration:none;">About</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/services" style="color:#ffffff;text-decoration:none;">Services</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/industries" style="color:#ffffff;text-decoration:none;">Industries</a><br>
                                            <a href="https://acrovix.com/products" style="color:#ffffff;text-decoration:none;">Products</a> &nbsp;|&nbsp; 
                                            <a href="https://acrovix.com/contact" style="color:#ffffff;text-decoration:none;">Contact</a>
                                        </p>
                                        <table role="presentation" align="right" style="margin-left:auto;margin-right:0;" class="mobile-center">
                                            <tr>
                                                <td style="padding:0 5px;"><a href="#"><img src="%s" alt="LinkedIn" width="24" style="display:block;"></a></td>
                                                <td style="padding:0 5px;"><a href="#"><img src="%s" alt="Twitter" width="24" style="display:block;"></a></td>
                                                <td style="padding:0 5px;"><a href="#"><img src="%s" alt="Instagram" width="24" style="display:block;"></a></td>
                                                <td style="padding:0 5px;"><a href="#"><img src="%s" alt="YouTube" width="24" style="display:block;"></a></td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td colspan="2" class="mobile-center" style="padding-top:25px;font-size:10px;color:#64748b;font-family:Arial,sans-serif;text-align:center;" align="center">
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
            heroLabel, heroTitleLine1, heroTitleLine2, heroSupportText, heroArtwork,
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
                <td style="padding:8px 0;color:#475569;font-size:13px;font-family:Arial,sans-serif;vertical-align:top;">%s</td>
                <td style="padding:8px 10px 8px 10px;color:#475569;font-size:13px;font-family:Arial,sans-serif;vertical-align:top;">:</td>
                <td style="padding:8px 0;color:#0f172a;font-size:13px;font-weight:600;font-family:Arial,sans-serif;vertical-align:top;word-break:break-word;overflow-wrap:anywhere;word-wrap:break-word;">%s</td>
            </tr>
        """.formatted(label, value);
    }
}
