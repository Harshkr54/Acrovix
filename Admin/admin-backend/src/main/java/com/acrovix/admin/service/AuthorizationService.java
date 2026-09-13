package com.acrovix.admin.service;

import com.acrovix.admin.entity.AdminEnquiry;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Quotation;
import com.acrovix.admin.entity.Role;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class AuthorizationService {

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
}
