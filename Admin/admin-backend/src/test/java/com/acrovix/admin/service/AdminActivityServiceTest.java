package com.acrovix.admin.service;

import com.acrovix.admin.dto.AdminActivityResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminActivityServiceTest {

    @Mock
    private AdminActivityRepository activityRepository;

    @Mock
    private AdminUserRepository userRepository;

    @InjectMocks
    private AdminActivityService activityService;

    private AdminUser testAdmin;
    private AdminActivity testActivity;

    @BeforeEach
    void setUp() {
        testAdmin = AdminUser.builder()
                .id(1L)
                .name("Harsh Kumar")
                .email("admin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .build();

        testActivity = AdminActivity.builder()
                .id(101L)
                .adminUserId(1L)
                .action("Updated Status to CONTACTED")
                .entityType("ENQUIRY")
                .entityId(45L)
                .description("Status changed from NEW to CONTACTED")
                .createdAt(LocalDateTime.now())
                .build();
    }

    @Test
    void testGetActivitiesReturnsPaginatedDTOsWithAdminNames() {
        PageImpl<AdminActivity> page = new PageImpl<>(List.of(testActivity), PageRequest.of(0, 20), 1);
        when(activityRepository.findAll(any(PageRequest.class))).thenReturn(page);
        when(userRepository.findAllById(Set.of(1L))).thenReturn(List.of(testAdmin));

        Page<AdminActivityResponse> result = activityService.getActivities(0, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        AdminActivityResponse dto = result.getContent().get(0);
        assertEquals(101L, dto.getId());
        assertEquals("Harsh Kumar", dto.getAdminName());
        assertEquals("Updated Status to CONTACTED", dto.getAction());
        assertEquals("ENQUIRY", dto.getEntityType());
        assertEquals(45L, dto.getEntityId());
        verify(activityRepository).findAll(any(PageRequest.class));
        verify(userRepository).findAllById(Set.of(1L));
    }

    @Test
    void testGetActivitiesHandlesUnknownAdminUserGracefully() {
        PageImpl<AdminActivity> page = new PageImpl<>(List.of(testActivity), PageRequest.of(0, 20), 1);
        when(activityRepository.findAll(any(PageRequest.class))).thenReturn(page);
        when(userRepository.findAllById(Set.of(1L))).thenReturn(List.of());

        Page<AdminActivityResponse> result = activityService.getActivities(0, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        AdminActivityResponse dto = result.getContent().get(0);
        assertEquals("Admin #1", dto.getAdminName());
    }
}
