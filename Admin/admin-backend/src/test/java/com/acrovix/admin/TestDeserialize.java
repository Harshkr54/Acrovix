package com.acrovix.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.acrovix.admin.dto.crm.CrmLeadStatusUpdateRequest;
import com.acrovix.admin.entity.LeadStatus;

public class TestDeserialize {
    public static void main(String[] args) throws Exception {
        String json = "{\"status\": \"CONTACTED\", \"lostReason\": null}";
        ObjectMapper mapper = new ObjectMapper();
        CrmLeadStatusUpdateRequest req = mapper.readValue(json, CrmLeadStatusUpdateRequest.class);
        System.out.println(req.getStatus());
    }
}
