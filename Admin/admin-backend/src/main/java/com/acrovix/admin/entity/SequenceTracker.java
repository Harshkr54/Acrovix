package com.acrovix.admin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "sequence_tracker")
@Getter
@Setter
public class SequenceTracker {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "sequence_name", unique = true, nullable = false, length = 100)
    private String sequenceName;
    
    @Column(name = "next_val", nullable = false)
    private Long nextVal;
}
