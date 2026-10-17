package com.acrovix.admin.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.EncodeHintType;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * High-performance, 100% offline in-memory QR Code generator using Google ZXing.
 * Eliminates all external paid or third-party web services (e.g. api.qrserver.com).
 */
@Slf4j
@Service
public class QrCodeService {

    private static final int DEFAULT_SIZE = 260;

    /**
     * Generates a PNG byte array for any given text/URI directly inside JVM memory.
     */
    public byte[] generateQrCodePng(String content, int width, int height) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("QR Code content cannot be empty.");
        }

        int targetWidth = width > 0 ? width : DEFAULT_SIZE;
        int targetHeight = height > 0 ? height : DEFAULT_SIZE;

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            Map<EncodeHintType, Object> hints = new HashMap<>();
            hints.put(EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());
            hints.put(EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            hints.put(EncodeHintType.MARGIN, 2);

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, targetWidth, targetHeight, hints);
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return outputStream.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate in-memory QR code: {}", e.getMessage(), e);
            throw new IllegalStateException("Failed to generate offline QR code: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a PNG data URI ("data:image/png;base64,...") suitable for immediate embedding in HTML/React.
     */
    public String generateQrCodeDataUri(String content, int width, int height) {
        byte[] pngBytes = generateQrCodePng(content, width, height);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(pngBytes);
    }

    /**
     * Constructs a compliant NPCI Bharat UPI deep-link URI.
     */
    public String buildUpiUri(String vpa, String payeeName, BigDecimal amount, String transactionNote, String currency) {
        String cleanVpa = vpa != null ? vpa.trim() : "payments@acrovix";
        String cleanName = payeeName != null && !payeeName.isBlank() ? payeeName.trim() : "Acrovix Innovations";
        String cleanCurr = currency != null && !currency.isBlank() ? currency.trim() : "INR";
        String cleanNote = transactionNote != null ? transactionNote.trim() : "Invoice Payment";

        StringBuilder uri = new StringBuilder("upi://pay?");
        uri.append("pa=").append(urlEncode(cleanVpa));
        uri.append("&pn=").append(urlEncode(cleanName));
        if (amount != null && amount.compareTo(BigDecimal.ZERO) > 0) {
            uri.append("&am=").append(amount.toPlainString());
        }
        uri.append("&cu=").append(urlEncode(cleanCurr));
        uri.append("&tn=").append(urlEncode(cleanNote));

        return uri.toString();
    }

    /**
     * Directly generates an offline UPI QR Code as a Base64 data URI.
     */
    public String generateUpiQrCodeDataUri(String vpa, String payeeName, BigDecimal amount, String transactionNote, String currency, int size) {
        String upiUri = buildUpiUri(vpa, payeeName, amount, transactionNote, currency);
        int targetSize = size > 0 ? size : DEFAULT_SIZE;
        return generateQrCodeDataUri(upiUri, targetSize, targetSize);
    }

    private String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
