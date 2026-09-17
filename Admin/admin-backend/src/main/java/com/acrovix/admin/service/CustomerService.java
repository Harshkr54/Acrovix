package com.acrovix.admin.service;

import com.acrovix.admin.dto.CustomerRequest;
import com.acrovix.admin.dto.CustomerResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.Customer;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final AdminActivityRepository activityRepository;

    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(String search, Boolean active, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Customer> customers = customerRepository.searchCustomers(search, active, pageRequest);

        List<CustomerResponse> responseList = customers.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responseList, pageRequest, customers.getTotalElements());
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        return mapToResponse(customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id)));
    }

    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request, Long adminId) {
        if (customerRepository.findByCustomerCode(request.getCustomerCode()).isPresent()) {
            throw new ResourceConflictException("Customer code already exists: " + request.getCustomerCode());
        }

        Customer customer = Customer.builder()
                .customerCode(request.getCustomerCode())
                .name(request.getName())
                .companyName(request.getCompanyName())
                .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
                .email(request.getEmail())
                .phone(request.getPhone())
                .alternatePhone(request.getAlternatePhone())
                .gstin(request.getGstin())
                .pan(request.getPan())
                .billingAddress(request.getBillingAddress())
                .shippingAddress(request.getShippingAddress())
                .paymentTerms(request.getPaymentTerms())
                .creditLimit(request.getCreditLimit())
                .active(true)
                .createdBy(adminId)
                .build();

        Customer savedCustomer = customerRepository.save(customer);
        logActivity(adminId, "CUSTOMER_CREATED", savedCustomer.getId(), "Created customer: " + savedCustomer.getName());

        return mapToResponse(savedCustomer);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request, Long adminId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        if (!customer.getCustomerCode().equals(request.getCustomerCode()) &&
                customerRepository.findByCustomerCode(request.getCustomerCode()).isPresent()) {
            throw new ResourceConflictException("Customer code already exists: " + request.getCustomerCode());
        }

        customer.setCustomerCode(request.getCustomerCode());
        customer.setName(request.getName());
        customer.setCompanyName(request.getCompanyName());
        if (request.getCurrency() != null) {
            customer.setCurrency(request.getCurrency());
        }
        customer.setEmail(request.getEmail());
        customer.setPhone(request.getPhone());
        customer.setAlternatePhone(request.getAlternatePhone());
        customer.setGstin(request.getGstin());
        customer.setPan(request.getPan());
        customer.setBillingAddress(request.getBillingAddress());
        customer.setShippingAddress(request.getShippingAddress());
        customer.setPaymentTerms(request.getPaymentTerms());
        customer.setCreditLimit(request.getCreditLimit());
        customer.setUpdatedBy(adminId);

        Customer updatedCustomer = customerRepository.save(customer);
        logActivity(adminId, "CUSTOMER_UPDATED", updatedCustomer.getId(), "Updated customer: " + updatedCustomer.getName());

        return mapToResponse(updatedCustomer);
    }

    @Transactional
    public void deleteCustomer(Long id, Long adminId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        customer.setActive(false);
        customer.setUpdatedBy(adminId);
        customerRepository.save(customer);

        logActivity(adminId, "CUSTOMER_DEACTIVATED", customer.getId(), "Deactivated customer: " + customer.getName());
    }
    
    @Transactional
    public void activateCustomer(Long id, Long adminId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        customer.setActive(true);
        customer.setUpdatedBy(adminId);
        customerRepository.save(customer);

        logActivity(adminId, "CUSTOMER_ACTIVATED", customer.getId(), "Activated customer: " + customer.getName());
    }

    private CustomerResponse mapToResponse(Customer customer) {
        return CustomerResponse.builder()
                .id(customer.getId())
                .customerCode(customer.getCustomerCode())
                .name(customer.getName())
                .companyName(customer.getCompanyName())
                .currency(customer.getCurrency())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .alternatePhone(customer.getAlternatePhone())
                .gstin(customer.getGstin())
                .pan(customer.getPan())
                .billingAddress(customer.getBillingAddress())
                .shippingAddress(customer.getShippingAddress())
                .paymentTerms(customer.getPaymentTerms())
                .creditLimit(customer.getCreditLimit())
                .active(customer.isActive())
                .createdBy(customer.getCreatedBy())
                .updatedBy(customer.getUpdatedBy())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt())
                .build();
    }

    private void logActivity(Long adminId, String action, Long entityId, String description) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("CUSTOMER")
                .entityId(entityId)
                .description(description)
                .build();
        activityRepository.save(activity);
    }
}
