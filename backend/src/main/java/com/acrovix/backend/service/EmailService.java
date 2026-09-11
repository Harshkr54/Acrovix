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

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

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

    @Value("${brevo.api-key}")
    private String brevoApiKey;

    public void sendCustomerAcknowledgement(Enquiry enquiry) {
        String subject = "Thank You for Contacting ACROVIX - " + enquiry.getReferenceId();
        String htmlBody = buildUserEmail(enquiry);
        sendHtmlEmail(enquiry.getBusinessEmail(), subject, htmlBody);
    }

    public void sendInternalNotification(Enquiry enquiry) {
        String subject = "New Enquiry Received - " + enquiry.getReferenceId();
        String htmlBody = buildAdminEmail(enquiry);
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

            logger.info("Successfully sent email to: {}", to);
        } catch (Exception e) {
            logger.error("Failed to send email to: {}", to, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // USER EMAIL  (Thank You)
    // ─────────────────────────────────────────────────────────────────────────
    private String buildUserEmail(Enquiry enquiry) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
        String date = enquiry.getCreatedAt() != null
            ? enquiry.getCreatedAt()
                     .atZone(ZoneId.of("UTC"))
                     .withZoneSameInstant(ZoneId.of("Asia/Kolkata"))
                     .format(fmt)
            : "N/A";

        String rows = buildRow("Full Name", enquiry.getFullName())
                    + buildRow("Company / Organization", enquiry.getCompanyName())
                    + buildRow("Phone Number", enquiry.getPhoneNumber())
                    + buildRow("Business Email", enquiry.getBusinessEmail())
                    + buildRow("Project / Requirement", enquiry.getProjectRequirement())
                    + buildLastRow("Submitted On", date);

        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>Thank You - ACROVIX</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;padding:30px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" border="0"
                     style="width:560px;max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                <!-- ══ HEADER ══ -->
                <tr>
                  <td align="center" style="padding:28px 40px 18px 40px;background-color:#ffffff;border-bottom:1px solid #e8edf2;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <!-- Logo text fallback (replace with img if you have logo URL) -->
                          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                            <tr>
                              <td style="padding-right:10px;vertical-align:middle;">
                                <!-- Triangle logo SVG inline -->
                                <svg width="36" height="32" viewBox="0 0 36 32" xmlns="http://www.w3.org/2000/svg">
                                  <polygon points="18,0 36,32 0,32" fill="none" stroke="#1a7a8a" stroke-width="3"/>
                                  <polygon points="18,8 30,28 6,28" fill="#1a7a8a"/>
                                </svg>
                              </td>
                              <td style="vertical-align:middle;">
                                <div style="font-size:22px;font-weight:900;color:#0d2137;letter-spacing:2px;line-height:1;">ACROVIX</div>
                                <div style="font-size:8px;color:#64748b;letter-spacing:1px;margin-top:2px;">INNOVATIONS PRIVATE LIMITED</div>
                              </td>
                            </tr>
                          </table>
                          <div style="font-size:10px;color:#64748b;letter-spacing:3px;">
                            SYNC &nbsp;|&nbsp; SCALE &nbsp;|&nbsp; SUCCEED
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ══ HERO BOX ══ -->
                <tr>
                  <td style="padding:30px 40px;">
                    <table width="100%%" cellpadding="0" cellspacing="0" border="0"
                           style="background-color:#eef6fb;border-radius:10px;padding:28px 30px;">
                      <tr>
                        <td align="center">
                          <!-- Green checkmark circle -->
                          <div style="width:56px;height:56px;border-radius:50%%;background-color:#17a589;margin:0 auto 16px auto;display:table;">
                            <table width="56" height="56" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td align="center" valign="middle">
                                  <svg width="26" height="26" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg">
                                    <polyline points="5,13 10,19 21,7" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                                  </svg>
                                </td>
                              </tr>
                            </table>
                          </div>
                          <div style="font-size:26px;font-weight:900;color:#0d2137;margin-bottom:6px;">Thank You!</div>
                          <div style="font-size:14px;color:#334155;margin-bottom:14px;">Your enquiry has been received.</div>
                          <div style="font-size:13px;color:#475569;line-height:1.7;text-align:center;">
                            We appreciate your interest in <strong>ACROVIX</strong>.<br>
                            Our team will review your enquiry and get back to you<br>
                            as soon as possible.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ══ ENQUIRY DETAILS ══ -->
                <tr>
                  <td style="padding:0 40px 10px 40px;">
                    <div style="font-size:15px;font-weight:700;color:#0d2137;margin-bottom:12px;">Enquiry Details</div>
                    <table width="100%%" cellpadding="0" cellspacing="0" border="0"
                           style="border:1px solid #dde5ed;border-radius:8px;overflow:hidden;">
                      %s
                    </table>
                  </td>
                </tr>

                <!-- ══ NOTE ══ -->
                <tr>
                  <td style="padding:18px 40px 10px 40px;text-align:center;">
                    <div style="font-size:13px;color:#64748b;">
                      If you have any additional information, feel free to reply to this email.
                    </div>
                  </td>
                </tr>

                <!-- ══ CTA BUTTON ══ -->
                <tr>
                  <td style="padding:14px 40px 32px 40px;text-align:center;">
                    <a href="https://acrovix.com"
                       style="display:inline-block;background-color:#17a589;color:#ffffff;font-size:14px;font-weight:700;
                              text-decoration:none;padding:13px 36px;border-radius:6px;letter-spacing:0.5px;">
                      Visit Our Website &nbsp;&rarr;
                    </a>
                  </td>
                </tr>

                <!-- ══ SIGN OFF ══ -->
                <tr>
                  <td style="padding:10px 40px 24px 40px;text-align:center;">
                    <div style="font-size:13px;color:#64748b;">Best Regards,</div>
                    <div style="font-size:14px;font-weight:700;color:#0d2137;margin-top:2px;">Team ACROVIX</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;letter-spacing:0.5px;">ACROVIX INNOVATIONS PRIVATE LIMITED</div>
                  </td>
                </tr>

                <!-- ══ FOOTER BAR ══ -->
                <tr>
                  <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;">
                    <table width="100%%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:18px;vertical-align:middle;">
                                <span style="font-size:12px;color:#475569;">&#9993;&nbsp;
                                  <a href="mailto:sales@acrovix.com" style="color:#475569;text-decoration:none;">sales@acrovix.com</a>
                                </span>
                              </td>
                              <td style="padding-right:18px;color:#cbd5e1;vertical-align:middle;">|</td>
                              <td style="vertical-align:middle;">
                                <span style="font-size:12px;color:#475569;">&#127760;&nbsp;
                                  <a href="https://acrovix.com" style="color:#475569;text-decoration:none;">www.acrovix.com</a>
                                </span>
                              </td>
                            </tr>
                          </table>
                          <div style="margin-top:8px;font-size:11px;color:#94a3b8;">
                            <strong>Bengaluru Office:</strong> Kengeri Satellite Town, Bengaluru, Karnataka, India
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            <strong>Bihar Office:</strong> Near Mahadev Singh College, Sarai, Bhagalpur, Bihar, India
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
        """.formatted(rows);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN EMAIL  (New Enquiry Received)
    // ─────────────────────────────────────────────────────────────────────────
    private String buildAdminEmail(Enquiry enquiry) {
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
        String date = enquiry.getCreatedAt() != null
            ? enquiry.getCreatedAt()
                     .atZone(ZoneId.of("UTC"))
                     .withZoneSameInstant(ZoneId.of("Asia/Kolkata"))
                     .format(fmt)
            : "N/A";

        String rows = buildRow("Full Name", enquiry.getFullName())
                    + buildRow("Company / Organization", enquiry.getCompanyName())
                    + buildRow("Phone Number", enquiry.getPhoneNumber())
                    + buildRow("Business Email", enquiry.getBusinessEmail())
                    + buildRow("Project / Requirement", enquiry.getProjectRequirement())
                    + buildRow("Industry Sector", enquiry.getIndustrySector())
                    + buildRow("Service Interested In", enquiry.getServiceRequired())
                    + buildRow("Preferred Contact Method", enquiry.getPreferredContactMethod())
                    + buildLastRow("Submitted On", date);

        return """
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>New Enquiry - ACROVIX Admin</title>
        </head>
        <body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">
        <table width="100%%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;padding:30px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" border="0"
                     style="width:560px;max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

                <!-- ══ HEADER ══ -->
                <tr>
                  <td align="center" style="padding:28px 40px 18px 40px;background-color:#ffffff;border-bottom:1px solid #e8edf2;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                            <tr>
                              <td style="padding-right:10px;vertical-align:middle;">
                                <svg width="36" height="32" viewBox="0 0 36 32" xmlns="http://www.w3.org/2000/svg">
                                  <polygon points="18,0 36,32 0,32" fill="none" stroke="#1a7a8a" stroke-width="3"/>
                                  <polygon points="18,8 30,28 6,28" fill="#1a7a8a"/>
                                </svg>
                              </td>
                              <td style="vertical-align:middle;">
                                <div style="font-size:22px;font-weight:900;color:#0d2137;letter-spacing:2px;line-height:1;">ACROVIX</div>
                                <div style="font-size:8px;color:#64748b;letter-spacing:1px;margin-top:2px;">INNOVATIONS PRIVATE LIMITED</div>
                              </td>
                            </tr>
                          </table>
                          <div style="font-size:10px;color:#64748b;letter-spacing:3px;">
                            SYNC &nbsp;|&nbsp; SCALE &nbsp;|&nbsp; SUCCEED
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ══ HERO BOX ══ -->
                <tr>
                  <td style="padding:30px 40px;">
                    <table width="100%%" cellpadding="0" cellspacing="0" border="0"
                           style="background-color:#eef6fb;border-radius:10px;padding:28px 30px;">
                      <tr>
                        <td align="center">
                          <!-- Document icon circle -->
                          <div style="width:56px;height:56px;border-radius:50%%;background-color:#d0e8f7;margin:0 auto 16px auto;display:table;">
                            <table width="56" height="56" cellpadding="0" cellspacing="0" border="0">
                              <tr>
                                <td align="center" valign="middle">
                                  <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="6" y="2" width="16" height="24" rx="2" ry="2" fill="none" stroke="#2980b9" stroke-width="2"/>
                                    <line x1="10" y1="9" x2="18" y2="9" stroke="#2980b9" stroke-width="1.5" stroke-linecap="round"/>
                                    <line x1="10" y1="13" x2="18" y2="13" stroke="#2980b9" stroke-width="1.5" stroke-linecap="round"/>
                                    <line x1="10" y1="17" x2="15" y2="17" stroke="#2980b9" stroke-width="1.5" stroke-linecap="round"/>
                                  </svg>
                                </td>
                              </tr>
                            </table>
                          </div>
                          <div style="font-size:24px;font-weight:900;color:#0d2137;margin-bottom:10px;">New Enquiry Received</div>
                          <div style="font-size:13px;color:#475569;line-height:1.7;text-align:center;">
                            A new enquiry has been submitted through the ACROVIX website.<br>
                            Please find the details below.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- ══ ENQUIRY DETAILS ══ -->
                <tr>
                  <td style="padding:0 40px 10px 40px;">
                    <div style="font-size:15px;font-weight:700;color:#0d2137;margin-bottom:12px;">Enquiry Details</div>
                    <table width="100%%" cellpadding="0" cellspacing="0" border="0"
                           style="border:1px solid #dde5ed;border-radius:8px;overflow:hidden;">
                      %s
                    </table>
                  </td>
                </tr>

                <!-- ══ CTA BUTTON ══ -->
                <tr>
                  <td style="padding:22px 40px 32px 40px;text-align:center;">
                    <a href="https://acrovix.com/admin"
                       style="display:inline-block;background-color:#0d2137;color:#ffffff;font-size:14px;font-weight:700;
                              text-decoration:none;padding:13px 36px;border-radius:6px;letter-spacing:0.5px;">
                      View in Admin Panel &nbsp;&rarr;
                    </a>
                  </td>
                </tr>

                <!-- ══ SIGN OFF ══ -->
                <tr>
                  <td style="padding:0 40px 24px 40px;">
                    <div style="font-size:13px;color:#64748b;">Regards,</div>
                    <div style="font-size:14px;font-weight:700;color:#0d2137;margin-top:2px;">ACROVIX Website</div>
                    <div style="font-size:11px;color:#94a3b8;margin-top:2px;letter-spacing:0.5px;">ACROVIX INNOVATIONS PRIVATE LIMITED</div>
                  </td>
                </tr>

                <!-- ══ FOOTER BAR ══ -->
                <tr>
                  <td style="background-color:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;">
                    <table width="100%%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding-right:18px;vertical-align:middle;">
                                <span style="font-size:12px;color:#475569;">&#9993;&nbsp;
                                  <a href="mailto:sales@acrovix.com" style="color:#475569;text-decoration:none;">sales@acrovix.com</a>
                                </span>
                              </td>
                              <td style="padding-right:18px;color:#cbd5e1;vertical-align:middle;">|</td>
                              <td style="vertical-align:middle;">
                                <span style="font-size:12px;color:#475569;">&#127760;&nbsp;
                                  <a href="https://acrovix.com" style="color:#475569;text-decoration:none;">www.acrovix.com</a>
                                </span>
                              </td>
                            </tr>
                          </table>
                          <div style="margin-top:8px;font-size:11px;color:#94a3b8;">
                            <strong>Bengaluru Office:</strong> Kengeri Satellite Town, Bengaluru, Karnataka, India
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            <strong>Bihar Office:</strong> Near Mahadev Singh College, Sarai, Bhagalpur, Bihar, India
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
        </body>
        </html>
        """.formatted(rows);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER: Table rows with alternating background & border separators
    // ─────────────────────────────────────────────────────────────────────────
    private String buildRow(String label, String value) {
        if (value == null || value.trim().isEmpty()) value = "Not specified";
        value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        return """
            <tr>
              <td style="padding:12px 18px;font-size:13px;color:#64748b;border-bottom:1px solid #e8edf2;
                         width:45%%;vertical-align:top;">%s</td>
              <td style="padding:12px 18px;font-size:13px;color:#0d2137;font-weight:700;
                         border-bottom:1px solid #e8edf2;vertical-align:top;word-break:break-word;">%s</td>
            </tr>
        """.formatted(label, value);
    }

    private String buildLastRow(String label, String value) {
        if (value == null || value.trim().isEmpty()) value = "Not specified";
        value = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
        return """
            <tr>
              <td style="padding:12px 18px;font-size:13px;color:#64748b;width:45%%;vertical-align:top;">%s</td>
              <td style="padding:12px 18px;font-size:13px;color:#0d2137;font-weight:700;
                         vertical-align:top;word-break:break-word;">%s</td>
            </tr>
        """.formatted(label, value);
    }
}

