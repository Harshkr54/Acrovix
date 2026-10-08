package com.acrovix.admin.service;

import com.acrovix.admin.dto.GstVerificationResponse;

public interface GstVerificationService {
    GstVerificationResponse verify(String gstin);
}
