package com.acrovix.admin.service;

import com.acrovix.admin.dto.CustomerRequest;
import com.acrovix.admin.dto.CustomerResponse;
import com.acrovix.admin.entity.Customer;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CustomerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private com.acrovix.admin.repository.AdminUserRepository adminUserRepository;

    @InjectMocks
    private CustomerService customerService;

    private CustomerRequest request;

    @BeforeEach
    void setUp() {
        request = new CustomerRequest();
        request.setCustomerCode("CUST-001");
        request.setName("John Doe");
        request.setEmail("john@example.com");
    }

    @Test
    void createCustomer_Success() {
        when(customerRepository.findByCustomerCode(request.getCustomerCode())).thenReturn(Optional.empty());
        Customer savedCustomer = Customer.builder().id(1L).customerCode("CUST-001").name("John Doe").build();
        when(customerRepository.save(any(Customer.class))).thenReturn(savedCustomer);

        CustomerResponse response = customerService.createCustomer(request, 100L);

        assertNotNull(response);
        assertEquals("CUST-001", response.getCustomerCode());
        verify(activityRepository).save(any());
    }

    @Test
    void createCustomer_DuplicateCode() {
        when(customerRepository.findByCustomerCode(request.getCustomerCode())).thenReturn(Optional.of(new Customer()));

        assertThrows(ResourceConflictException.class, () -> customerService.createCustomer(request, 100L));
    }

    @Test
    void deactivateCustomer_Success() {
        Customer customer = Customer.builder().id(1L).active(true).build();
        when(customerRepository.findById(1L)).thenReturn(Optional.of(customer));
        
        customerService.deleteCustomer(1L, 100L);

        assertFalse(customer.isActive());
        verify(customerRepository).save(customer);
        verify(activityRepository).save(any());
    }
    @Test
    void getCustomers_Pagination() {
        when(customerRepository.searchCustomers(any(), any(), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of(Customer.builder().id(1L).active(true).build())));
        
        org.springframework.data.domain.Page<CustomerResponse> result = customerService.getCustomers(null, null, 0, 100);
        
        assertNotNull(result);
        assertEquals(1, result.getContent().size());
    }
}
