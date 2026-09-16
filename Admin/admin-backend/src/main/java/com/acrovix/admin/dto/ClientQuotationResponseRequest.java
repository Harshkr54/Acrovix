package com.acrovix.admin.dto;

import lombok.Data;

/**
 * Request body for a client's public Accept or Reject response on a quotation.
 */
@Data
public class ClientQuotationResponseRequest {
    /** ACCEPT or REJECT */
    private String action;

    /** Optional rejection reason from the client */
    private String rejectionNotes;
}
