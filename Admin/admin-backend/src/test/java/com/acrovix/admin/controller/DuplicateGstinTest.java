package com.acrovix.admin.controller;

import com.acrovix.admin.entity.Customer;
import com.acrovix.admin.repository.CustomerRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
public class DuplicateGstinTest {

    @Autowired
    private CustomerRepository repo;

    @Test
    public void testDuplicateGstin() {
        Customer c1 = Customer.builder()
                .customerCode("C1")
                .name("N1")
                .gstin("GST123")
                .createdBy(1L)
                .build();
        repo.save(c1);
        
        Customer c2 = Customer.builder()
                .customerCode("C2")
                .name("N2")
                .gstin("GST123")
                .createdBy(1L)
                .build();
        repo.save(c2);
    }
}
