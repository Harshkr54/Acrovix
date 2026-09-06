package com.acrovix.backend.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnquiryResponseData {

    private Long id;
    private String referenceId;
    private LocalDateTime createdAt;
}
