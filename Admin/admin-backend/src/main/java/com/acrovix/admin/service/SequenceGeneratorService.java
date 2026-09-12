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
}
