package com.acrovix.admin.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmailAttachment {
    private String filename;
    private byte[] content;
    private String contentType;
}
