package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quotation_column_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotationColumnConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quotation_id", nullable = false)
    private Quotation quotation;

    @Column(name = "column_key", nullable = false, length = 50)
    private String columnKey;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    @Column(name = "column_type", nullable = false, length = 20)
    private String columnType; // TEXT, NUMBER, CURRENCY

    @Builder.Default
    @Column(nullable = false)
    private Boolean visible = true;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder;

    @Builder.Default
    @Column(name = "is_custom", nullable = false)
    private Boolean isCustom = false;
}
