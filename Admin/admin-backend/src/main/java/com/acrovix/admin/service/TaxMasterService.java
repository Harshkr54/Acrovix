package com.acrovix.admin.service;

import com.acrovix.admin.dto.TaxMasterRequest;
import com.acrovix.admin.dto.TaxMasterResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.TaxMaster;
import com.acrovix.admin.exception.ResourceNotFoundException;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.TaxMasterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaxMasterService {

    private final TaxMasterRepository taxMasterRepository;
    private final AdminActivityRepository activityRepository;

    @Transactional(readOnly = true)
    public List<TaxMasterResponse> getAllTaxes() {
        return taxMasterRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaxMasterResponse getTaxById(Long id) {
        return mapToResponse(taxMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax Master not found with id: " + id)));
    }

    @Transactional
    public TaxMasterResponse createTax(TaxMasterRequest request, Long adminId) {
        TaxMaster taxMaster = TaxMaster.builder()
                .name(request.getName())
                .gstPercent(request.getGstPercent())
                .description(request.getDescription())
                .active(true)
                .build();

        TaxMaster savedTax = taxMasterRepository.save(taxMaster);
        logActivity(adminId, "TAX_CREATED", savedTax.getId(), "Created tax rate: " + savedTax.getName());

        return mapToResponse(savedTax);
    }

    @Transactional
    public TaxMasterResponse updateTax(Long id, TaxMasterRequest request, Long adminId) {
        TaxMaster taxMaster = taxMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax Master not found with id: " + id));

        taxMaster.setName(request.getName());
        taxMaster.setGstPercent(request.getGstPercent());
        taxMaster.setDescription(request.getDescription());

        TaxMaster updatedTax = taxMasterRepository.save(taxMaster);
        logActivity(adminId, "TAX_UPDATED", updatedTax.getId(), "Updated tax rate: " + updatedTax.getName());

        return mapToResponse(updatedTax);
    }

    @Transactional
    public void deleteTax(Long id, Long adminId) {
        TaxMaster taxMaster = taxMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax Master not found with id: " + id));

        taxMaster.setActive(false);
        taxMasterRepository.save(taxMaster);

        logActivity(adminId, "TAX_DEACTIVATED", taxMaster.getId(), "Deactivated tax rate: " + taxMaster.getName());
    }
    
    @Transactional
    public void activateTax(Long id, Long adminId) {
        TaxMaster taxMaster = taxMasterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tax Master not found with id: " + id));

        taxMaster.setActive(true);
        taxMasterRepository.save(taxMaster);

        logActivity(adminId, "TAX_ACTIVATED", taxMaster.getId(), "Activated tax rate: " + taxMaster.getName());
    }

    private TaxMasterResponse mapToResponse(TaxMaster taxMaster) {
        return TaxMasterResponse.builder()
                .id(taxMaster.getId())
                .name(taxMaster.getName())
                .gstPercent(taxMaster.getGstPercent())
                .description(taxMaster.getDescription())
                .active(taxMaster.isActive())
                .createdAt(taxMaster.getCreatedAt())
                .updatedAt(taxMaster.getUpdatedAt())
                .build();
    }

    private void logActivity(Long adminId, String action, Long entityId, String description) {
        AdminActivity activity = AdminActivity.builder()
                .adminUserId(adminId)
                .action(action)
                .entityType("TAX_MASTER")
                .entityId(entityId)
                .description(description)
                .build();
        activityRepository.save(activity);
    }
}
