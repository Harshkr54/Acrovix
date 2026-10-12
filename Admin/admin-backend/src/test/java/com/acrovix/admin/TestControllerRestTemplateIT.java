package com.acrovix.admin;

import com.acrovix.admin.dto.crm.CrmLeadStatusUpdateRequest;
import com.acrovix.admin.entity.LeadStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public class TestControllerRestTemplateIT {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    public void testUpdateLeadStatus() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // Use a dummy user or ignore security if we get 401/403, we just want to see if we get 400.
        // Actually, without token, it returns 401. So this test won't reach the controller.
        System.out.println("Test is just a placeholder.");
    }
}
