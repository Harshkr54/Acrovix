package com.acrovix.admin.service;

import com.acrovix.admin.dto.BulkCustomerOperationResponse;
import com.acrovix.admin.dto.BulkCustomerStatusRequest;
import com.acrovix.admin.dto.CustomerRequest;
import com.acrovix.admin.dto.CustomerResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.Customer;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Currency;
import com.acrovix.admin.exception.ResourceConflictException;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final AdminActivityRepository activityRepository;
    private final com.acrovix.admin.repository.AdminUserRepository adminUserRepository;
    private final NotificationService notificationService;
    private final AuthorizationService authorizationService;
    private final SequenceGeneratorService sequenceGeneratorService;

    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(String search, Boolean active, int page, int size) {
        return getCustomers(search, active, null, null, null, page, size, null);
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        return getCustomerById(id, null);
    }

    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(String search, Boolean active, int page, int size, AdminUser admin) {
        return getCustomers(search, active, null, null, null, page, size, admin);
    }

    @Transactional(readOnly = true)
    public Page<CustomerResponse> getCustomers(String search, Boolean active, Currency currency, LocalDateTime fromDate, LocalDateTime toDate, int page, int size, AdminUser admin) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Long salesUserId = (admin != null && admin.getRole() == com.acrovix.admin.entity.Role.SALES) ? admin.getId() : null;
        Page<Customer> customers;
        if (salesUserId != null) {
            if (currency == null && fromDate == null && toDate == null) {
                customers = customerRepository.searchCustomersWithSalesFilter(search, active, salesUserId, pageRequest);
            } else {
                customers = customerRepository.searchCustomersWithSalesFilter(search, active, currency, fromDate, toDate, salesUserId, pageRequest);
            }
        } else {
            if (currency == null && fromDate == null && toDate == null) {
                customers = customerRepository.searchCustomers(search, active, pageRequest);
            } else {
                customers = customerRepository.searchCustomers(search, active, currency, fromDate, toDate, pageRequest);
            }
        }

        List<CustomerResponse> responseList = customers.getContent().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return new PageImpl<>(responseList, pageRequest, customers.getTotalElements());
    }

    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id, AdminUser admin) {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
        Customer c = (tenantId != null ? customerRepository.findByTenantIdAndId(tenantId, id) : customerRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));
        if (admin != null && admin.getRole() == com.acrovix.admin.entity.Role.SALES) {
            authorizationService.checkCustomer360Access(admin, c);
        }
        return mapToResponse(c);
    }

    @Transactional
    public String getNextCustomerCode() {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
        if (tenantId == null) {
            tenantId = 1L;
        }
        syncCustomerSequenceIfNecessary(tenantId);
        return sequenceGeneratorService.peekNextCustomerCode(tenantId);
    }

    private void syncCustomerSequenceIfNecessary(Long tenantId) {
        List<String> codes = customerRepository.findCustomerCodesLikePrefix(tenantId);
        long maxNum = 0;
        for (String c : codes) {
            if (c != null && c.startsWith("CUST-")) {
                try {
                    long num = Long.parseLong(c.substring(5).trim());
                    if (num > maxNum) {
                        maxNum = num;
                    }
                } catch (NumberFormatException ignored) {}
            }
        }
        if (maxNum > 0) {
            sequenceGeneratorService.ensureCustomerSequenceAtLeast(tenantId, maxNum + 1);
        }
    }

    @Transactional
    public CustomerResponse createCustomer(CustomerRequest request, Long adminId) {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
        if (tenantId == null) {
            tenantId = 1L;
        }

        String assignedCode = request.getCustomerCode();
        if (assignedCode == null || assignedCode.isBlank()) {
            syncCustomerSequenceIfNecessary(tenantId);
            assignedCode = sequenceGeneratorService.generateNextCustomerCode(tenantId);
        } else {
            assignedCode = assignedCode.trim();
            if (assignedCode.startsWith("CUST-")) {
                try {
                    long num = Long.parseLong(assignedCode.substring(5).trim());
                    sequenceGeneratorService.ensureCustomerSequenceAtLeast(tenantId, num + 1);
                } catch (NumberFormatException ignored) {}
            }
        }

        boolean codeExists = (tenantId != null)
                ? customerRepository.findByTenantIdAndCustomerCode(tenantId, assignedCode).isPresent()
                : customerRepository.findByCustomerCode(assignedCode).isPresent();
        if (codeExists) {
            throw new ResourceConflictException("Customer code already exists: " + assignedCode);
        }
        
        if (request.getGstin() != null && !request.getGstin().isBlank()) {
            boolean gstinExists = (tenantId != null)
                    ? customerRepository.findByTenantIdAndGstin(tenantId, request.getGstin()).isPresent()
                    : customerRepository.findByGstin(request.getGstin()).isPresent();
            if (gstinExists) {
                throw new ResourceConflictException("Customer with GSTIN already exists: " + request.getGstin());
            }
        }

        Customer customer = Customer.builder()
                .customerCode(assignedCode)
                .name(request.getName())
                .companyName(request.getCompanyName())
                .currency(request.getCurrency() != null ? request.getCurrency() : Currency.INR)
                .email(request.getEmail())
                .phone(request.getPhone())
                .alternatePhone(request.getAlternatePhone())
                .gstin(request.getGstin())
                .pan(request.getPan())
                .state(request.getState())
                .billingAddress(request.getBillingAddress())
                .shippingAddress(request.getShippingAddress())
                .paymentTerms(request.getPaymentTerms())
                .creditLimit(request.getCreditLimit())
                .active(true)
                .createdBy(adminId)
                .build();

        Customer savedCustomer = customerRepository.save(customer);
        logActivity(adminId, "CUSTOMER_CREATED", savedCustomer.getId(), "Created customer: " + savedCustomer.getName());

        adminUserRepository.findById(adminId).ifPresent(user -> 
                notificationService.createCustomerCreatedNotification(user, savedCustomer.getName(), savedCustomer.getId())
        );

        return mapToResponse(savedCustomer);
    }

    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerRequest request, AdminUser adminUser) {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
        Customer customer = (tenantId != null ? customerRepository.findByTenantIdAndId(tenantId, id) : customerRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        if (adminUser != null && adminUser.getRole() == com.acrovix.admin.entity.Role.SALES) {
            authorizationService.checkCustomer360Access(adminUser, customer);
        }

        if (!customer.getCustomerCode().equals(request.getCustomerCode())) {
            boolean codeExists = (tenantId != null)
                    ? customerRepository.findByTenantIdAndCustomerCode(tenantId, request.getCustomerCode()).isPresent()
                    : customerRepository.findByCustomerCode(request.getCustomerCode()).isPresent();
            if (codeExists) {
                throw new ResourceConflictException("Customer code already exists: " + request.getCustomerCode());
            }
        }
        
        if (request.getGstin() != null && !request.getGstin().isBlank() && 
            !request.getGstin().equals(customer.getGstin())) {
            boolean gstinExists = (tenantId != null)
                    ? customerRepository.findByTenantIdAndGstin(tenantId, request.getGstin()).isPresent()
                    : customerRepository.findByGstin(request.getGstin()).isPresent();
            if (gstinExists) {
                throw new ResourceConflictException("Customer with GSTIN already exists: " + request.getGstin());
            }
        }

        Long adminId = adminUser != null ? adminUser.getId() : null;

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
        customer.setState(request.getState());
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
    public CustomerResponse updateCustomer(Long id, CustomerRequest request, Long adminId) {
        AdminUser admin = adminId != null ? adminUserRepository.findById(adminId).orElse(null) : null;
        return updateCustomer(id, request, admin);
    }

    @Transactional
    public void deleteCustomer(Long id, AdminUser adminUser) {
        Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
        Customer customer = (tenantId != null ? customerRepository.findByTenantIdAndId(tenantId, id) : customerRepository.findById(id))
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        if (adminUser != null && adminUser.getRole() == com.acrovix.admin.entity.Role.SALES) {
            authorizationService.checkCustomer360Access(adminUser, customer);
        }

        Long adminId = adminUser != null ? adminUser.getId() : null;
        customer.setActive(false);
        customer.setUpdatedBy(adminId);
        customerRepository.save(customer);

        logActivity(adminId, "CUSTOMER_DEACTIVATED", customer.getId(), "Deactivated customer: " + customer.getName());
    }

    @Transactional
    public void deleteCustomer(Long id, Long adminId) {
        AdminUser admin = adminId != null ? adminUserRepository.findById(adminId).orElse(null) : null;
        deleteCustomer(id, admin);
    }
    
    @Transactional
    public void activateCustomer(Long id, AdminUser adminUser) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with id: " + id));

        if (adminUser != null && adminUser.getRole() == com.acrovix.admin.entity.Role.SALES) {
            authorizationService.checkCustomer360Access(adminUser, customer);
        }

        Long adminId = adminUser != null ? adminUser.getId() : null;
        customer.setActive(true);
        customer.setUpdatedBy(adminId);
        customerRepository.save(customer);

        logActivity(adminId, "CUSTOMER_ACTIVATED", customer.getId(), "Activated customer: " + customer.getName());
    }

    @Transactional
    public void activateCustomer(Long id, Long adminId) {
        AdminUser admin = adminId != null ? adminUserRepository.findById(adminId).orElse(null) : null;
        activateCustomer(id, admin);
    }

    @Transactional
    public BulkCustomerOperationResponse bulkUpdateCustomerStatus(BulkCustomerStatusRequest request, AdminUser adminUser) {
        if (request == null || request.getCustomerIds() == null || request.getCustomerIds().isEmpty()) {
            return BulkCustomerOperationResponse.builder()
                    .totalRequested(0)
                    .successCount(0)
                    .failureCount(0)
                    .successfulIds(new ArrayList<>())
                    .failures(new ArrayList<>())
                    .build();
        }

        List<Long> customerIds = request.getCustomerIds();
        boolean newActive = Boolean.TRUE.equals(request.getActive());
        Long adminId = adminUser != null ? adminUser.getId() : null;

        List<Long> successfulIds = new ArrayList<>();
        List<BulkCustomerOperationResponse.BulkFailureDetail> failures = new ArrayList<>();

        for (Long id : customerIds) {
            if (id == null) continue;
            try {
                Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
                Customer customer = (tenantId != null ? customerRepository.findByTenantIdAndId(tenantId, id) : customerRepository.findById(id)).orElse(null);
                if (customer == null) {
                    failures.add(new BulkCustomerOperationResponse.BulkFailureDetail(id, "Customer not found with ID: " + id));
                    continue;
                }

                // Check role-based authorization for sales rep
                if (adminUser != null && adminUser.getRole() == com.acrovix.admin.entity.Role.SALES) {
                    try {
                        authorizationService.checkCustomer360Access(adminUser, customer);
                    } catch (org.springframework.security.access.AccessDeniedException ade) {
                        failures.add(new BulkCustomerOperationResponse.BulkFailureDetail(id, ade.getMessage()));
                        continue;
                    }
                }

                customer.setActive(newActive);
                customer.setUpdatedBy(adminId);
                customerRepository.save(customer);

                String activityType = newActive ? "CUSTOMER_ACTIVATED" : "CUSTOMER_DEACTIVATED";
                String actionVerb = newActive ? "Activated" : "Deactivated";
                logActivity(adminId, activityType, customer.getId(), actionVerb + " customer: " + customer.getName() + " via bulk action");
                successfulIds.add(customer.getId());
            } catch (Exception e) {
                log.error("Failed to update status for customer ID {}: {}", id, e.getMessage());
                failures.add(new BulkCustomerOperationResponse.BulkFailureDetail(id, e.getMessage() != null ? e.getMessage() : "Unexpected error"));
            }
        }

        return BulkCustomerOperationResponse.builder()
                .totalRequested(customerIds.size())
                .successCount(successfulIds.size())
                .failureCount(failures.size())
                .successfulIds(successfulIds)
                .failures(failures)
                .build();
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
                .state(customer.getState())
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
        Long tenantId = com.acrovix.admin.tenant.TenantContext.getTenantId();
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("CUSTOMER")
                .entityId(entityId)
                .description(description)
                .build();
        activity.setTenantId(tenantId != null ? tenantId : 1L);
        activityRepository.save(activity);
    }
}
