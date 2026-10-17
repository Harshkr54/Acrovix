package com.acrovix.admin.service;

import com.acrovix.admin.entity.SequenceTracker;
import com.acrovix.admin.repository.SequenceTrackerRepository;
import com.acrovix.admin.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

@Service
@RequiredArgsConstructor
public class SequenceGeneratorService {

    private final SequenceTrackerRepository repository;

    private SequenceTracker getOrCreateTracker(String sequenceName) {
        return getOrCreateTracker(sequenceName, null);
    }

    private SequenceTracker getOrCreateTracker(String sequenceName, Long targetTenantId) {
        Long tenantId = targetTenantId != null ? targetTenantId : TenantContext.getTenantId();
        if (tenantId == null) {
            tenantId = 1L;
        }

        final Long currentTenantId = tenantId;
        return repository.findByTenantIdAndSequenceNameForUpdate(currentTenantId, sequenceName)
                .orElseGet(() -> {
                    SequenceTracker newTracker = new SequenceTracker();
                    newTracker.setTenantId(currentTenantId);
                    newTracker.setSequenceName(sequenceName);
                    newTracker.setNextVal(1L);
                    return newTracker;
                });
    }

    @Transactional
    public String generateNextQuotationNumber() {
        return generateNextQuotationNumber(null);
    }

    @Transactional
    public String generateNextQuotationNumber(Long tenantId) {
        int year = Year.now().getValue();
        String sequenceName = "QUOTATION_" + year;

        SequenceTracker tracker = getOrCreateTracker(sequenceName, tenantId);
        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("ACX-Q-%d-%04d", year, currentVal);
    }

    @Transactional
    public String generateNextPurchaseOrderNumber(java.time.LocalDate documentDate) {
        return generateNextPurchaseOrderNumber(documentDate, null);
    }

    @Transactional
    public String generateNextPurchaseOrderNumber(java.time.LocalDate documentDate, Long tenantId) {
        int year = documentDate.getYear();
        int month = documentDate.getMonthValue();
        
        int startYear;
        int endYear;
        
        if (month >= 4) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }
        
        String fyString = String.format("%02d-%02d", startYear % 100, endYear % 100);
        String sequenceName = "PURCHASE_ORDER_" + startYear + "_" + endYear;

        SequenceTracker tracker = getOrCreateTracker(sequenceName, tenantId);
        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("ACX/PO/%s/%04d", fyString, currentVal);
    }

    @Transactional
    public String generateNextInvoiceNumber(com.acrovix.admin.entity.InvoiceType type, java.time.LocalDate documentDate) {
        return generateNextInvoiceNumber(type, documentDate, null);
    }

    @Transactional
    public String generateNextInvoiceNumber(com.acrovix.admin.entity.InvoiceType type, java.time.LocalDate documentDate, Long tenantId) {
        int year = documentDate.getYear();
        int month = documentDate.getMonthValue();
        
        int startYear;
        int endYear;
        
        if (month >= 4) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }
        
        String fyString = String.format("%02d-%02d", startYear % 100, endYear % 100);
        String prefix = type == com.acrovix.admin.entity.InvoiceType.PROFORMA ? "PROFORMA" : "INVOICE";
        String sequenceName = prefix + "_" + startYear + "_" + endYear;

        SequenceTracker tracker = getOrCreateTracker(sequenceName, tenantId);
        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        String docPrefix = type == com.acrovix.admin.entity.InvoiceType.PROFORMA ? "PI" : "INV";
        return String.format("ACX/%s/%s/%04d", docPrefix, fyString, currentVal);
    }

    @Transactional
    public String generateNextPaymentNumber(java.time.LocalDate paymentDate) {
        return generateNextPaymentNumber(paymentDate, null);
    }

    @Transactional
    public String generateNextPaymentNumber(java.time.LocalDate paymentDate, Long tenantId) {
        int year = paymentDate.getYear();
        int month = paymentDate.getMonthValue();
        
        int startYear;
        int endYear;
        
        if (month >= 4) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }
        
        String fyString = String.format("%02d-%02d", startYear % 100, endYear % 100);
        String sequenceName = "PAYMENT_" + startYear + "_" + endYear;

        SequenceTracker tracker = getOrCreateTracker(sequenceName, tenantId);
        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("ACX/PAY/%s/%04d", fyString, currentVal);
    }

    @Transactional
    public String generateNextLeadNumber(java.time.LocalDate documentDate) {
        return generateNextLeadNumber(documentDate, null);
    }

    @Transactional
    public String generateNextLeadNumber(java.time.LocalDate documentDate, Long tenantId) {
        java.time.LocalDate date = (documentDate != null) ? documentDate : java.time.LocalDate.now();
        int year = date.getYear();
        int month = date.getMonthValue();
        
        int startYear;
        int endYear;
        
        if (month >= 4) {
            startYear = year;
            endYear = year + 1;
        } else {
            startYear = year - 1;
            endYear = year;
        }
        
        String fyString = String.format("%02d-%02d", startYear % 100, endYear % 100);
        String sequenceName = "LEAD_" + startYear + "_" + endYear;

        SequenceTracker tracker = getOrCreateTracker(sequenceName, tenantId);
        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("ACX/LEAD/%s/%04d", fyString, currentVal);
    }

    @Transactional
    public String generateNextCustomerCode() {
        return generateNextCustomerCode(null);
    }

    @Transactional
    public String generateNextCustomerCode(Long tenantId) {
        String sequenceName = "CUSTOMER";
        SequenceTracker tracker = getOrCreateTracker(sequenceName, tenantId);
        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("CUST-%03d", currentVal);
    }

    @Transactional
    public String peekNextCustomerCode(Long tenantId) {
        String sequenceName = "CUSTOMER";
        Long effectiveTenantId = tenantId != null ? tenantId : TenantContext.getTenantId();
        if (effectiveTenantId == null) {
            effectiveTenantId = 1L;
        }
        SequenceTracker tracker = getOrCreateTracker(sequenceName, effectiveTenantId);
        return String.format("CUST-%03d", tracker.getNextVal());
    }

    @Transactional
    public void ensureCustomerSequenceAtLeast(Long tenantId, Long minNextVal) {
        String sequenceName = "CUSTOMER";
        Long effectiveTenantId = tenantId != null ? tenantId : TenantContext.getTenantId();
        if (effectiveTenantId == null) {
            effectiveTenantId = 1L;
        }
        SequenceTracker tracker = getOrCreateTracker(sequenceName, effectiveTenantId);
        if (tracker.getNextVal() < minNextVal) {
            tracker.setNextVal(minNextVal);
            repository.save(tracker);
        }
    }
}
