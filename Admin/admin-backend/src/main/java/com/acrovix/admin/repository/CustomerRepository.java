package com.acrovix.admin.repository;

import com.acrovix.admin.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByCustomerCode(String customerCode);

    @Query("SELECT c FROM Customer c WHERE " +
           "(:search IS NULL OR LOWER(c.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.customerCode) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(c.companyName) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:active IS NULL OR c.active = :active)")
    Page<Customer> searchCustomers(@Param("search") String search, @Param("active") Boolean active, Pageable pageable);
}
