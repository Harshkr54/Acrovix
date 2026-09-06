package com.acrovix.backend.repository;

import com.acrovix.backend.entity.Enquiry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnquiryRepository extends JpaRepository<Enquiry, Long> {
    boolean existsByReferenceId(String referenceId);
}
