package com.acrovix.admin.repository;

import com.acrovix.admin.entity.ProductService;
import com.acrovix.admin.entity.ProductServiceType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductServiceRepository extends JpaRepository<ProductService, Long> {
    Optional<ProductService> findBySku(String sku);

    @Query("SELECT p FROM ProductService p WHERE " +
           "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "AND (:active IS NULL OR p.active = :active) " +
           "AND (:type IS NULL OR p.type = :type)")
    Page<ProductService> searchCatalog(@Param("search") String search, @Param("active") Boolean active, @Param("type") ProductServiceType type, Pageable pageable);
}
