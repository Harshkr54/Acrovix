package com.acrovix.admin.controller;
import com.acrovix.admin.dto.crm.CrmLeadStatusUpdateRequest;
import com.acrovix.admin.entity.LeadStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
public class TestCrmController {
    @Test
    public void testDeserialization() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        String json = "{\"status\":\"CONTACTED\",\"lostReason\":null}";
        CrmLeadStatusUpdateRequest req = mapper.readValue(json, CrmLeadStatusUpdateRequest.class);
        System.out.println("STATUS=" + req.getStatus());
    }
}
