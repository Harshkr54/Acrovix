package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.Role;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import com.acrovix.admin.entity.PurchaseOrder;
import com.acrovix.admin.entity.Invoice;
import com.acrovix.admin.entity.Payment;
import com.acrovix.admin.entity.Customer;
import lombok.RequiredArgsConstructor;
import com.acrovix.admin.repository.CrmLeadRepository;
import com.acrovix.admin.repository.QuotationRepository;

@Service
@RequiredArgsConstructor
public class AuthorizationService {

    private final CrmLeadRepository crmLeadRepository;
    private final QuotationRepository quotationRepository;

    /**
     * Checks whether the current user is authorized to access or modify an enquiry.
     * - SUPER_ADMIN: Full access to all enquiries.
     * - SALES: Can access/modify enquiries assigned to themselves OR unassigned enquiries.
     *          Must NOT access/modify enquiries assigned to another SALES user.
     */
    public void checkEnquiryAccess(AdminUser user, AdminEnquiry enquiry) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return; // Full access for SUPER_ADMIN
        }
        if (user.getRole() == Role.SALES) {
            if (enquiry.getAssignedTo() == null) {
                return; // Unassigned enquiry accessible by SALES
            }
            if (enquiry.getAssignedTo().getId() != null && enquiry.getAssignedTo().getId().equals(user.getId())) {
                return; // Assigned to this SALES user
            }
            throw new AccessDeniedException("Access denied: Enquiry is assigned to another sales representative");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }

    /**
     * Checks whether the current user is authorized to access or modify a quotation.
     * - SUPER_ADMIN: Full access to all quotations.
     * - SALES: Can access/modify quotations created by themselves OR belonging to enquiries
     *          assigned to themselves OR belonging to unassigned enquiries.
     *          Must NOT access/modify quotations belonging to another SALES user's assigned enquiry.
     */
    public void checkQuotationAccess(AdminUser user, Quotation quotation) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return; // Full access for SUPER_ADMIN
        }
        if (user.getRole() == Role.SALES) {
            if (quotation.getCreatedBy() != null && quotation.getCreatedBy().getId() != null && quotation.getCreatedBy().getId().equals(user.getId())) {
                return; // Created by this user
            }
            if (quotation.getEnquiry() != null) {
                AdminEnquiry enquiry = quotation.getEnquiry();
                if (enquiry.getAssignedTo() == null) {
                    return; // Quotation for unassigned enquiry
                }
                if (enquiry.getAssignedTo().getId() != null && enquiry.getAssignedTo().getId().equals(user.getId())) {
                    return; // Quotation for enquiry assigned to this user
                }
            }
            throw new AccessDeniedException("Access denied: Quotation belongs to another sales representative");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }

    public void checkPurchaseOrderAccess(AdminUser user, PurchaseOrder po) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (user.getRole() == Role.SALES) {
            if (po.getCreatedBy() != null && po.getCreatedBy().getId() != null && po.getCreatedBy().getId().equals(user.getId())) {
                return;
            }
            if (po.getQuotation() != null) {
                checkQuotationAccess(user, po.getQuotation());
                return;
            }
            throw new AccessDeniedException("Access denied: Purchase Order belongs to another sales representative");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }

    public void checkInvoiceAccess(AdminUser user, Invoice invoice) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (user.getRole() == Role.SALES) {
            if (invoice.getCreatedBy() != null && invoice.getCreatedBy().getId() != null && invoice.getCreatedBy().getId().equals(user.getId())) {
                return;
            }
            if (invoice.getPurchaseOrder() != null) {
                checkPurchaseOrderAccess(user, invoice.getPurchaseOrder());
                return;
            }
            if (invoice.getQuotation() != null) {
                checkQuotationAccess(user, invoice.getQuotation());
                return;
            }
            throw new AccessDeniedException("Access denied: Invoice belongs to another sales representative");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }

    public void checkPaymentAccess(AdminUser user, Payment payment) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (user.getRole() == Role.SALES) {
            if (payment.getRecordedBy() != null && payment.getRecordedBy().getId() != null && payment.getRecordedBy().getId().equals(user.getId())) {
                return;
            }
            if (payment.getInvoice() != null) {
                checkInvoiceAccess(user, payment.getInvoice());
                return;
            }
            throw new AccessDeniedException("Access denied: Payment belongs to another sales representative");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }

    public void checkCustomer360Access(AdminUser user, Customer customer) {
        if (user == null) {
            throw new AccessDeniedException("Access denied: Unauthenticated user");
        }
        if (user.getRole() == Role.SUPER_ADMIN) {
            return;
        }
        if (user.getRole() == Role.SALES) {
            if (crmLeadRepository.existsByCustomerIdAndAssignedToId(customer.getId(), user.getId())) {
                return;
            }
            if (quotationRepository.existsByCustomerIdAndCreatedById(customer.getId(), user.getId())) {
                return;
            }
            throw new AccessDeniedException("Access denied: You do not have assigned leads or quotations for this customer");
        }
        throw new AccessDeniedException("Access denied: Insufficient permissions");
    }
}
