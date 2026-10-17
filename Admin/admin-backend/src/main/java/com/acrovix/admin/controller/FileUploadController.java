package com.acrovix.admin.controller;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/admin/uploads")
@RequiredArgsConstructor
public class FileUploadController {

    private static final long MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/webp",
            "image/svg+xml"
    );

    @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES', 'EDITOR')")
    public ResponseEntity<?> uploadLogo(
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal AdminUser adminUser) {

        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "File cannot be empty"));
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(Map.of("error", "File size exceeds the 2MB limit"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid file type. Allowed: PNG, JPEG, WEBP, SVG"));
        }

        // Determine file extension safely from validated MIME type
        String extension = switch (contentType.toLowerCase()) {
            case "image/png" -> "png";
            case "image/jpeg" -> "jpg";
            case "image/webp" -> "webp";
            case "image/svg+xml" -> "svg";
            default -> "png";
        };

        // Resolve Tenant ID securely from tenant context or authenticated user
        Long tenantId = TenantContext.getTenantId();
        if (tenantId == null && adminUser != null) {
            tenantId = adminUser.getTenantId();
        }
        if (tenantId == null) {
            tenantId = 1L;
        }

        // Deterministic sanitized filename: logo_{tenantId}_{System.currentTimeMillis()}.{extension}
        String filename = "logo_" + tenantId + "_" + System.currentTimeMillis() + "." + extension;

        try {
            Path targetDir = Paths.get("./uploads/tenants/" + tenantId);
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }

            Path destinationPath = targetDir.resolve(filename);
            Files.copy(file.getInputStream(), destinationPath, StandardCopyOption.REPLACE_EXISTING);

            String relativeUrl = "/uploads/tenants/" + tenantId + "/" + filename;
            log.info("Uploaded tenant logo successfully: tenantId={}, path={}", tenantId, relativeUrl);

            return ResponseEntity.ok(Map.of("url", relativeUrl));
        } catch (IOException e) {
            log.error("Failed to store tenant logo file", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to store file on server"));
        }
    }
}
