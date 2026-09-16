package com.acrovix.admin.service;

import com.acrovix.admin.entity.SequenceTracker;
import com.acrovix.admin.repository.SequenceTrackerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;

@Service
@RequiredArgsConstructor
public class SequenceGeneratorService {

    private final SequenceTrackerRepository repository;

    @Transactional
    public String generateNextQuotationNumber() {
        int year = Year.now().getValue();
        String sequenceName = "QUOTATION_" + year;

        SequenceTracker tracker = repository.findBySequenceNameForUpdate(sequenceName)
                .orElseGet(() -> {
                    SequenceTracker newTracker = new SequenceTracker();
                    newTracker.setSequenceName(sequenceName);
                    newTracker.setNextVal(1L);
                    return newTracker;
                });

        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("ACX-Q-%d-%04d", year, currentVal);
    }

    @Transactional
    public String generateNextPurchaseOrderNumber(java.time.LocalDate documentDate) {
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

        SequenceTracker tracker = repository.findBySequenceNameForUpdate(sequenceName)
                .orElseGet(() -> {
                    SequenceTracker newTracker = new SequenceTracker();
                    newTracker.setSequenceName(sequenceName);
                    newTracker.setNextVal(1L);
                    return newTracker;
                });

        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        return String.format("ACX/PO/%s/%04d", fyString, currentVal);
    }

    @Transactional
    public String generateNextInvoiceNumber(com.acrovix.admin.entity.InvoiceType type, java.time.LocalDate documentDate) {
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

        SequenceTracker tracker = repository.findBySequenceNameForUpdate(sequenceName)
                .orElseGet(() -> {
                    SequenceTracker newTracker = new SequenceTracker();
                    newTracker.setSequenceName(sequenceName);
                    newTracker.setNextVal(1L);
                    return newTracker;
                });

        Long currentVal = tracker.getNextVal();
        tracker.setNextVal(currentVal + 1);
        repository.save(tracker);

        String docPrefix = type == com.acrovix.admin.entity.InvoiceType.PROFORMA ? "PI" : "INV";
        return String.format("ACX/%s/%s/%04d", docPrefix, fyString, currentVal);
    }
}
