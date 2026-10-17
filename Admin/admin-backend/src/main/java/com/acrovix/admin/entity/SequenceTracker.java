package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sequence_tracker", uniqueConstraints = {
    @UniqueConstraint(name = "uq_sequence_tracker_tenant_sequence", columnNames = {"tenant_id", "sequence_name"})
})
@Getter
@Setter
public class SequenceTracker extends TenantAwareEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "sequence_name", nullable = false, length = 100)
    private String sequenceName;
    
    @Column(name = "next_val", nullable = false)
    private Long nextVal;
}
