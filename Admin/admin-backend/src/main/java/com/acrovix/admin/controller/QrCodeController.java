package com.acrovix.admin.controller;

import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.CompanyBankAccountRepository;
import com.acrovix.admin.repository.CompanySettingsRepository;
import com.acrovix.admin.repository.InvoiceRepository;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.service.QrCodeService;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.concurrent.TimeUnit;

/**
 * Public high-speed, zero-dependency REST endpoint for generating offline QR codes.
 * Replaces all external web services like api.qrserver.com or Google Charts API.
 */
@Slf4j
@RestController
@RequestMapping("/api/public/qr")
@RequiredArgsConstructor
public class QrCodeController {

    private final QrCodeService qrCodeService;
    private final InvoiceRepository invoiceRepository;
    private final CompanySettingsRepository companySettingsRepository;
    private final CompanyBankAccountRepository companyBankAccountRepository;
    private final TenantRepository tenantRepository;

    /**
     * Generates a raw PNG QR code image for any text/UPI URI.
     */
    @GetMapping(produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getQrCode(
            @RequestParam("data") String data,
            @RequestParam(value = "size", defaultValue = "260") int size) {

        if (data == null || data.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        int clampedSize = Math.max(120, Math.min(size, 800));
        byte[] pngBytes = qrCodeService.generateQrCodePng(data, clampedSize, clampedSize);

        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"qrcode.png\"")
                .cacheControl(CacheControl.maxAge(30, TimeUnit.DAYS).cachePublic())
                .body(pngBytes);
    }

    /**
     * Dedicated dynamic UPI QR code generator for public invoice payments.
     */
    @GetMapping(value = "/invoice/{token}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getInvoiceUpiQrCode(
            @PathVariable("token") String token,
            @RequestParam(value = "size", defaultValue = "260") int size) {

        if (token == null || token.isBlank()) {
            throw new ResourceNotFoundException("Invalid public payment token");
        }

        Invoice invoice = TenantContext.callWithBypassRls(() ->
                invoiceRepository.findByPublicToken(token)
                        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found or link has expired"))
        );

        Long tenantId = invoice.getTenantId();

        return TenantContext.callWithTenant(tenantId, () -> {
            var settingsOpt = companySettingsRepository.findByTenantId(tenantId)
                    .or(() -> companySettingsRepository.findFirstByTenantIdOrderByIdAsc(tenantId));

            var bankOpt = companyBankAccountRepository.findFirstByTenantIdAndIsDefaultTrueAndIsActiveTrue(tenantId)
                    .or(() -> companyBankAccountRepository.findFirstByTenantIdAndIsActiveTrueOrderByIdAsc(tenantId));

            var tenantOpt = tenantRepository.findById(tenantId);

            String companyName = settingsOpt.map(s -> s.getCompanyName())
                    .filter(s -> !s.isBlank())
                    .orElseGet(() -> tenantOpt.map(t -> t.getCompanyName()).orElse("Acrovix Innovations"));

            String upiId = bankOpt.flatMap(b -> java.util.Optional.ofNullable(b.getUpiId()))
                    .filter(u -> !u.isBlank())
                    .orElseGet(() -> {
                        String acc = bankOpt.map(b -> b.getBankAccountNumber()).orElseGet(() -> settingsOpt.map(s -> s.getBankAccountNumber()).orElse(null));
                        String ifsc = bankOpt.map(b -> b.getBankIfsc()).orElseGet(() -> settingsOpt.map(s -> s.getBankIfsc()).orElse(null));
                        if (acc != null && ifsc != null) {
                            return acc + "@" + ifsc.toLowerCase();
                        }
                        return "payments@acrovix";
                    });

            BigDecimal balanceDue = invoice.getBalanceDue() != null ? invoice.getBalanceDue() : invoice.getGrandTotal();
            String note = "Invoice " + (invoice.getInvoiceNumber() != null ? invoice.getInvoiceNumber() : "");
            String currency = invoice.getCurrency() != null ? invoice.getCurrency().name() : "INR";

            String upiUri = qrCodeService.buildUpiUri(upiId, companyName, balanceDue, note, currency);

            int clampedSize = Math.max(120, Math.min(size, 800));
            byte[] pngBytes = qrCodeService.generateQrCodePng(upiUri, clampedSize, clampedSize);

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_PNG)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"invoice_upi_qr.png\"")
                    .cacheControl(CacheControl.noCache())
                    .body(pngBytes);
        });
    }
}
