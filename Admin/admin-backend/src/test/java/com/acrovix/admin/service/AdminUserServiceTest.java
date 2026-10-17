package com.acrovix.admin.service;

import com.acrovix.admin.dto.AdminUserResponse;
import com.acrovix.admin.entity.AdminActivity;
import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.repository.AdminActivityRepository;
import com.acrovix.admin.repository.AdminUserRepository;
import com.acrovix.admin.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceTest {

    @Mock
    private AdminUserRepository userRepository;

    @Mock
    private AdminActivityRepository activityRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Mock
    private AuthService authService;

    @Mock
    private com.acrovix.admin.repository.PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private com.acrovix.admin.service.TenantQuotaService tenantQuotaService;

    @InjectMocks
    private AdminUserService userService;

    private AdminUser superAdmin;
    private AdminUser salesUser;
    private AdminUser disabledUser;

    @BeforeEach
    void setUp() {
        com.acrovix.admin.tenant.TenantContext.clear();
        superAdmin = AdminUser.builder()
                .id(1L)
                .name("Super Admin")
                .email("superadmin@acrovix.com")
                .role(Role.SUPER_ADMIN)
                .enabled(true)
                .build();

        salesUser = AdminUser.builder()
                .id(2L)
                .name("Sales Rep")
                .email("sales@acrovix.com")
                .role(Role.SALES)
                .enabled(true)
                .build();

        disabledUser = AdminUser.builder()
                .id(3L)
                .name("Former Employee")
                .email("former@acrovix.com")
                .role(Role.SALES)
                .enabled(false)
                .build();
    }

    @org.junit.jupiter.api.AfterEach
    void tearDown() {
        com.acrovix.admin.tenant.TenantContext.clear();
    }

    @Test
    void testGetAllUsers_NullFilter_ReturnsAllUsers() {
        when(userRepository.findAll()).thenReturn(List.of(superAdmin, salesUser, disabledUser));

        List<AdminUserResponse> result = userService.getAllUsers(null);

        assertEquals(3, result.size());
        verify(userRepository).findAll();
        verify(userRepository, never()).findByEnabled(anyBoolean());
    }

    @Test
    void testGetAllUsers_ActiveFilter_ReturnsOnlyActiveUsers() {
        when(userRepository.findByEnabled(true)).thenReturn(List.of(superAdmin, salesUser));

        List<AdminUserResponse> result = userService.getAllUsers(true);

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(AdminUserResponse::isEnabled));
        verify(userRepository).findByEnabled(true);
    }

    @Test
    void testGetAllUsers_InactiveFilter_ReturnsOnlyInactiveUsers() {
        when(userRepository.findByEnabled(false)).thenReturn(List.of(disabledUser));

        List<AdminUserResponse> result = userService.getAllUsers(false);

        assertEquals(1, result.size());
        assertFalse(result.get(0).isEnabled());
        assertEquals("former@acrovix.com", result.get(0).getEmail());
        verify(userRepository).findByEnabled(false);
    }

    @Test
    void testGetUserById_Success() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));

        AdminUserResponse response = userService.getUserById(2L);

        assertNotNull(response);
        assertEquals(2L, response.getId());
        assertEquals("sales@acrovix.com", response.getEmail());
    }

    @Test
    void testDeactivateUser_Success_UpdatesStatusAndAuditLog() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));

        userService.updateUserStatus(2L, false, null, 1L);

        assertFalse(salesUser.isEnabled());
        verify(userRepository).save(salesUser);

        ArgumentCaptor<AdminActivity> activityCaptor = ArgumentCaptor.forClass(AdminActivity.class);
        verify(activityRepository).save(activityCaptor.capture());
        AdminActivity logged = activityCaptor.getValue();
        assertEquals(1L, logged.getAdminUserId());
        assertEquals("Disabled Admin User: sales@acrovix.com", logged.getAction());
        assertEquals(2L, logged.getEntityId());
    }

    @Test
    void testDeactivateUser_WithReassignment_ReassignsPendingWorkAndLogsActivity() {
        AdminUser targetAssignee = AdminUser.builder()
                .id(4L)
                .name("New Sales")
                .email("newsales@acrovix.com")
                .role(Role.SALES)
                .enabled(true)
                .build();

        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));
        when(userRepository.findById(4L)).thenReturn(Optional.of(targetAssignee));

        userService.updateUserStatus(2L, false, 4L, 1L);

        assertFalse(salesUser.isEnabled());
        verify(userRepository).reassignActiveEnquiries(salesUser, targetAssignee);
        verify(userRepository).reassignActiveLeads(salesUser, targetAssignee);
        verify(userRepository).reassignPendingFollowUps(salesUser, targetAssignee);
        verify(userRepository).save(salesUser);

        ArgumentCaptor<AdminActivity> activityCaptor = ArgumentCaptor.forClass(AdminActivity.class);
        verify(activityRepository).save(activityCaptor.capture());
        assertTrue(activityCaptor.getValue().getAction().contains("reassigned work to User ID: 4"));
    }

    @Test
    void testDeactivateUser_SelfDeactivationPrevented() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                userService.updateUserStatus(1L, false, null, 1L));
        assertEquals("Cannot disable yourself", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void testDeactivateUser_LastActiveSuperAdminPrevented() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(superAdmin));
        when(userRepository.countByRoleAndEnabledTrue(Role.SUPER_ADMIN)).thenReturn(1L);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                userService.updateUserStatus(1L, false, null, 99L));
        assertEquals("Cannot disable the last active Super Admin", ex.getMessage());
        verify(userRepository, never()).save(any());
    }

    @Test
    void testDeactivateUser_CannotReassignToSelf() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                userService.updateUserStatus(2L, false, 2L, 1L));
        assertEquals("Cannot reassign work to the user being disabled", ex.getMessage());
    }

    @Test
    void testDeactivateUser_CannotReassignToDisabledUser() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));
        when(userRepository.findById(3L)).thenReturn(Optional.of(disabledUser));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                userService.updateUserStatus(2L, false, 3L, 1L));
        assertEquals("Cannot reassign to a disabled user", ex.getMessage());
    }

    @Test
    void testReactivateUser_Success_RestoresAccessAndLogsActivity() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(disabledUser));

        userService.updateUserStatus(3L, true, null, 1L);

        assertTrue(disabledUser.isEnabled());
        verify(userRepository).save(disabledUser);

        ArgumentCaptor<AdminActivity> activityCaptor = ArgumentCaptor.forClass(AdminActivity.class);
        verify(activityRepository).save(activityCaptor.capture());
        AdminActivity logged = activityCaptor.getValue();
        assertEquals("Reactivated Admin User: former@acrovix.com", logged.getAction());
    }

    @Test
    void testDisabledUser_JwtTokenRejected() {
        JwtUtil jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secretKey", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 86400000L);

        String token = jwtUtil.generateToken(salesUser);
        assertTrue(jwtUtil.isTokenValid(token, salesUser));

        // When user becomes disabled
        salesUser.setEnabled(false);
        assertFalse(jwtUtil.isTokenValid(token, salesUser), "Disabled user JWT must be rejected by isTokenValid");
    }

    @Test
    void testSendPasswordResetLink_Success() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));
        when(authService.requestPasswordResetWithResult("sales@acrovix.com"))
                .thenReturn(com.acrovix.admin.dto.email.EmailDispatchResult.accepted("Dispatched."));

        var res = userService.sendPasswordResetLink(2L, 1L);

        assertEquals("ACCEPTED", res.getStatus());
        assertEquals("ACCEPTED", res.getDeliveryStatus());
        verify(activityRepository).save(any(AdminActivity.class));
    }

    @Test
    void testSendPasswordResetLink_CannotRecoverSelf() {
        assertThrows(IllegalArgumentException.class, () ->
                userService.sendPasswordResetLink(1L, 1L));
    }

    @Test
    void testResetTemporaryPassword_Success() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(salesUser));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_temp_pw");

        var res = userService.resetTemporaryPassword(2L, 1L);

        assertNotNull(res.getTemporaryPassword());
        assertEquals(16, res.getTemporaryPassword().length());
        assertTrue(salesUser.isMustChangePassword(), "User must be flagged with mustChangePassword = true");
        assertEquals("hashed_temp_pw", salesUser.getPassword());
        verify(userRepository).save(salesUser);
        verify(activityRepository).save(any(AdminActivity.class));
    }

    @Test
    void testResetTemporaryPassword_CannotResetSelf() {
        assertThrows(IllegalArgumentException.class, () ->
                userService.resetTemporaryPassword(1L, 1L));
    }

    @Test
    void testResetTemporaryPassword_DisabledUserFails() {
        when(userRepository.findById(3L)).thenReturn(Optional.of(disabledUser));

        assertThrows(IllegalStateException.class, () ->
                userService.resetTemporaryPassword(3L, 1L));
    }
}
