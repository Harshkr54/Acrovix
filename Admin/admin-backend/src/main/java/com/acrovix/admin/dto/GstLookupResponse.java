package com.acrovix.admin.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class GstLookupResponse {
    private String gstin;
    private String legalName;
    private String tradeName;
    private String address;
    private String state;
    private String pincode;
    private String placeOfSupply;
}
