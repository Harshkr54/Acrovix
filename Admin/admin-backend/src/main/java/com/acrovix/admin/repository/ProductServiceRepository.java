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
           "(LOWER(p.name) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%')) OR " +
           " LOWER(p.sku) LIKE LOWER(CONCAT('%', coalesce(:search, ''), '%'))) " +
           "AND (p.active = coalesce(:active, p.active)) " +
           "AND (p.type = coalesce(:type, p.type))")
    Page<ProductService> searchCatalog(@Param("search") String search, @Param("active") Boolean active, @Param("type") ProductServiceType type, Pageable pageable);
}
