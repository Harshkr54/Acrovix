package com.acrovix.admin.repository;

import com.acrovix.admin.entity.TaxMaster;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaxMasterRepository extends JpaRepository<TaxMaster, Long> {
    List<TaxMaster> findAllByOrderByCreatedAtDesc();
}
