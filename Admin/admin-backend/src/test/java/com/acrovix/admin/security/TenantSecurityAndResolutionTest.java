package com.acrovix.admin.security;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.entity.Role;
import com.acrovix.admin.entity.Tenant;
import com.acrovix.admin.entity.TenantStatus;
import com.acrovix.admin.repository.TenantRepository;
import com.acrovix.admin.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TenantSecurityAndResolutionTest {

    private JwtUtil jwtUtil;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private FilterChain filterChain;

    private TenantResolutionFilter resolutionFilter;

    private static final String TEST_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";

    @BeforeEach
    void setUp() {
        TenantContext.clear();

        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secretKey", TEST_SECRET);
        ReflectionTestUtils.setField(jwtUtil, "jwtExpiration", 3600000L);

        resolutionFilter = new TenantResolutionFilter(jwtUtil, tenantRepository);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("JWT embeds tenant_id and tenant_slug and extracts into TenantContext")
    void testJwtTokenCarriesAndExtractsTenantClaims() throws Exception {
        AdminUser user = AdminUser.builder()
                .id(10L)
                .email("admin@acme.com")
                .name("Acme Admin")
                .role(Role.SUPER_ADMIN)
                .tenantId(42L)
                .build();

        String token = jwtUtil.generateToken(user, 42L, "acme");

        assertNotNull(token);
        assertEquals(42L, jwtUtil.extractTenantId(token));
        assertEquals("acme", jwtUtil.extractTenantSlug(token));

        Tenant activeTenant = Tenant.builder()
                .id(42L)
                .slug("acme")
                .companyName("Acme Corp")
                .status(TenantStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(tenantRepository.findById(42L)).thenReturn(Optional.of(activeTenant));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        // During filter execution, check that TenantContext was populated
        doAnswer(invocation -> {
            assertEquals(42L, TenantContext.getTenantId(), "TenantContext must be populated inside filter execution");
            return null;
        }).when(filterChain).doFilter(any(), any());

        resolutionFilter.doFilter(request, response, filterChain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        verify(filterChain, times(1)).doFilter(request, response);

        // After filter completes, TenantContext must be completely purged
        assertNull(TenantContext.getTenantId(), "TenantContext must be cleared in finally block");
    }

    @Test
    @DisplayName("Inactive or suspended tenant request is rejected with HTTP 403 Forbidden")
    void testSuspendedTenantReturns403() throws Exception {
        AdminUser user = AdminUser.builder()
                .id(11L)
                .email("user@suspended.com")
                .role(Role.SALES)
                .tenantId(99L)
                .build();

        String token = jwtUtil.generateToken(user, 99L, "suspended-corp");

        Tenant suspendedTenant = Tenant.builder()
                .id(99L)
                .slug("suspended-corp")
                .companyName("Suspended Corp")
                .status(TenantStatus.SUSPENDED)
                .build();

        when(tenantRepository.findById(99L)).thenReturn(Optional.of(suspendedTenant));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        MockHttpServletResponse response = new MockHttpServletResponse();

        resolutionFilter.doFilter(request, response, filterChain);

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
        assertTrue(response.getContentAsString().contains("Tenant account inactive or suspended"));
        verify(filterChain, never()).doFilter(any(), any());
        assertNull(TenantContext.getTenantId());
    }

    @Test
    @DisplayName("Attempted tenant_id override via X-Tenant-ID header is rejected with 403")
    void testTenantIdHeaderSpoofingRejected() throws Exception {
        AdminUser user = AdminUser.builder()
                .id(12L)
                .email("user@tenant1.com")
                .role(Role.SUPER_ADMIN)
                .tenantId(1L)
                .build();

        String token = jwtUtil.generateToken(user, 1L, "default");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        request.addHeader("X-Tenant-ID", "99"); // Mismatched tenant spoof attempt
        MockHttpServletResponse response = new MockHttpServletResponse();

        resolutionFilter.doFilter(request, response, filterChain);

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
        assertTrue(response.getContentAsString().contains("Tenant context mismatch"));
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("Attempted tenant_id override via query parameter is rejected with 403")
    void testTenantIdQueryParameterSpoofingRejected() throws Exception {
        AdminUser user = AdminUser.builder()
                .id(13L)
                .email("user@tenant1.com")
                .role(Role.SUPER_ADMIN)
                .tenantId(1L)
                .build();

        String token = jwtUtil.generateToken(user, 1L, "default");

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        request.setParameter("tenant_id", "55"); // Mismatched tenant spoof attempt
        MockHttpServletResponse response = new MockHttpServletResponse();

        resolutionFilter.doFilter(request, response, filterChain);

        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
        assertTrue(response.getContentAsString().contains("Tenant context mismatch"));
        verify(filterChain, never()).doFilter(any(), any());
    }

    @Test
    @DisplayName("Unauthenticated public request resolves tenant from X-Tenant-Slug header")
    void testPublicTenantResolutionFromHeader() throws Exception {
        Tenant tenant = Tenant.builder()
                .id(7L)
                .slug("beta-client")
                .companyName("Beta Client LLC")
                .status(TenantStatus.ACTIVE)
                .build();

        when(tenantRepository.findBySlug("beta-client")).thenReturn(Optional.of(tenant));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Tenant-Slug", "beta-client");
        MockHttpServletResponse response = new MockHttpServletResponse();

        doAnswer(invocation -> {
            assertEquals(7L, TenantContext.getTenantId(), "TenantContext must resolve from X-Tenant-Slug");
            return null;
        }).when(filterChain).doFilter(any(), any());

        resolutionFilter.doFilter(request, response, filterChain);

        assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        verify(filterChain, times(1)).doFilter(request, response);
        assertNull(TenantContext.getTenantId(), "Context must be cleared after request");
    }

    @Test
    @DisplayName("TenantContext is cleared even when filter chain throws an unhandled exception")
    void testTenantContextClearedOnChainException() throws Exception {
        Tenant tenant = Tenant.builder()
                .id(1L)
                .slug("default")
                .companyName("Default")
                .status(TenantStatus.ACTIVE)
                .build();

        when(tenantRepository.findBySlug("default")).thenReturn(Optional.of(tenant));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("X-Tenant-Slug", "default");
        MockHttpServletResponse response = new MockHttpServletResponse();

        doThrow(new RuntimeException("Simulated unexpected downstream error"))
                .when(filterChain).doFilter(any(), any());

        assertThrows(RuntimeException.class, () -> resolutionFilter.doFilter(request, response, filterChain));

        // In finally block, context must still be purged
        assertNull(TenantContext.getTenantId(), "Context must be cleared even when downstream throws");
    }
}
