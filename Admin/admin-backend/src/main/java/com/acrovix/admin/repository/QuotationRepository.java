package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Quotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuotationRepository extends JpaRepository<Quotation, Long> {
    List<Quotation> findByEnquiryId(Long enquiryId);
    long countByStatus(String status);
}
