package com.acrovix.admin.service;

import com.acrovix.admin.dto.AdminActivityResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminActivityService {

    private final AdminActivityRepository activityRepository;
    private final AdminUserRepository userRepository;

    public Page<AdminActivityResponse> getActivities(int page, int size) {
        int safePage = Math.max(0, page);
        int safeSize = Math.min(100, Math.max(1, size));

        PageRequest pageRequest = PageRequest.of(safePage, safeSize, Sort.by("createdAt").descending());
        Page<AdminActivity> activityPage = activityRepository.findAll(pageRequest);

        List<AdminActivity> activities = activityPage.getContent();
        Set<Long> adminUserIds = activities.stream()
                .map(AdminActivity::getAdminUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Map<Long, String> userNamesMap = userRepository.findAllById(adminUserIds).stream()
                .collect(Collectors.toMap(
                        AdminUser::getId,
                        u -> u.getName() != null && !u.getName().isBlank() ? u.getName() : u.getEmail(),
                        (existing, replacement) -> existing
                ));

        List<AdminActivityResponse> responseList = activities.stream()
                .map(a -> AdminActivityResponse.builder()
                        .id(a.getId())
                        .adminUserId(a.getAdminUserId())
                        .adminName(userNamesMap.getOrDefault(a.getAdminUserId(), "Admin #" + a.getAdminUserId()))
                        .action(a.getAction())
                        .entityType(a.getEntityType())
                        .entityId(a.getEntityId())
                        .description(a.getDescription())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return new PageImpl<>(responseList, pageRequest, activityPage.getTotalElements());
    }
}
