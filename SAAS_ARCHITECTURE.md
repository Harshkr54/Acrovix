# Acrovix Multi-Tenant SaaS Architecture & Operations Runbook

## 1. Executive Architecture Overview

Acrovix operates as a multi-tenant B2B SaaS platform utilizing a **hybrid pooled architecture**:
- **Application Tier**: Stateless Spring Boot backend services running multi-tenant context filters and tenant-scoped caching.
- **Frontend Tier**: Dynamic white-labeled Vite React SPA adapting theme colors, custom logos, browser favicons, page titles, and currency representations dynamically per tenant.
- **Data Tier**: Pooled PostgreSQL schema secured by **PostgreSQL Row-Level Security (RLS)** policies combined with JPA Hibernate tenant listeners (`TenantEntityListener`).

---

## 2. Tenancy Resolution Flow

Tenancy is resolved on every HTTP request across both public and authenticated boundaries via `TenantResolutionFilter`:

```
                 Incoming HTTP Request
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    Public / Unauth Route       Authenticated Route
    (e.g. /workspace/:slug)      (Bearer JWT Header)
             │                           │
  1. Subdomain / Slug Header     1. Extract 'tenant_id' claim
     • Host header parsing          from validated JWT token
     • X-Tenant-ID / X-Tenant-Slug   2. Verify user enabled &
  2. Cache lookup in Redis/RAM         active status
             │                           │
             └─────────────┬─────────────┘
                           ▼
              TenantContext.setTenantId(id)
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
PostgreSQL Session Var                Hibernate Enforcer
SET LOCAL app.current_tenant_id = ?   TenantEntityListener: auto-injects
RLS policies enforce row isolation    tenant_id on PrePersist
```

### Context Resolution Priority
1. **JWT Claim (`tenant_id`)**: Highest priority for authenticated API calls.
2. **Explicit Header (`X-Tenant-ID` or `X-Tenant-Slug`)**: Used by Super Admins during workspace impersonation or public branding lookups.
3. **Subdomain Parsing**: e.g., `https://<slug>.acrovix.com` extracts `<slug>`.
4. **Fallback**: Defaults to Platform Owner Root Tenant (`tenant_id = 1`) only when explicitly exempt or during system bootstrap.

---

## 3. Platform Owner Lifetime Exemption Rules

Tenant ID `1` represents **Acrovix Innovations Private Limited** (the SaaS Platform Owner) and holds special governance privileges:

| Privilege / Exemption | Implementation & Guardrail |
| :--- | :--- |
| **Subscription Quotas** | Exempt from seat counts, storage quotas, and subscription expiry (`LIFETIME_INTERNAL` tier with `999,999` seats and unlimited storage). |
| **Subscription Immutability** | Database check constraints and `TenantProvisioningService` prohibit setting Tenant 1 to suspended, canceled, or non-internal tiers. |
| **Cross-Workspace Access** | Only users with role `SUPER_ADMIN` and `tenant_id = 1` can access `/api/v1/super-admin/**` and the `/workspaces` frontend route. |
| **Sequence Isolation** | Generates separate sequences (`ACX-QT-...`, `ACX-INV-...`) distinct from subscriber tenant numbers. |

---

## 4. Tenant Onboarding & Provisioning API Spec

Super Administrators provision new client workspaces via:

### `POST /api/v1/super-admin/tenants`

#### Request Payload:
```json
{
  "companyName": "Apex Global Corporation",
  "slug": "apex-global",
  "customDomain": "erp.apex.com",
  "planTier": "PRO",
  "adminFullName": "Alexander Wright",
  "adminEmail": "admin@apex.com",
  "adminPassword": "TemporarySecurePassword@123",
  "phone": "+1-555-0199"
}
```

#### Provisioning Workflow:
1. Validates slug uniqueness (lowercase alphanumeric + hyphens) and admin email uniqueness.
2. Inserts `tenants` record (`status = ACTIVE` or `TRIAL`).
3. Provisions `tenant_subscriptions` with plan tier quotas (`max_seats`, `max_storage_bytes`, `valid_until`).
4. Seeds default isolated `company_settings` (dynamic theme colors, currency, timezone, brand badge).
5. Seeds initial `admin_users` record assigned with `Role.COMPANY_ADMIN` scoped strictly to the new `tenant_id`.
6. Sends white-labeled onboarding welcome email with initial temporary login credentials.

---

## 5. Security & Route Protection Matrix

| Route / Resource | Required Role | Required Tenant Context | Behavior on Violation |
| :--- | :--- | :--- | :--- |
| `/workspaces` (UI) | `SUPER_ADMIN` | `tenant_id == 1` | Redirects to `/dashboard` or shows 403 Forbidden |
| `/api/v1/super-admin/**` | `SUPER_ADMIN` | `tenant_id == 1` | `403 Forbidden` (`@tenantSecurity.isPlatformOwner`) |
| `/api/admin/company-settings` | `COMPANY_ADMIN` / `SUPER_ADMIN` | Active `TenantContext` | Only reads/mutates active tenant's settings |
| `/workspace/:slug/login` (UI) | Any | Matches `:slug` | Loads tenant branding; sets workspace cookie |

---

## 6. Developer Guide: Adding New Tenant-Aware Entities

To add a new database table or JPA entity that participates in multi-tenant isolation:

### Step 1: Extend `TenantAwareEntity`
```java
package com.acrovix.admin.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Table(name = "custom_feature_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomFeatureItem extends TenantAwareEntity {

    private String name;
    private String description;
}
```
*Note: Extending `TenantAwareEntity` automatically inherits `@Column(name = "tenant_id", nullable = false)`, `@EntityListeners(TenantEntityListener.class)`, and automatic tenant assignment on `save()`.*

### Step 2: Add Database Migration with RLS
Create a Flyway migration file `V<N>__add_custom_feature_items.sql`:
```sql
CREATE TABLE custom_feature_items (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_feature_items_tenant ON custom_feature_items(tenant_id);

-- Enable PostgreSQL Row-Level Security
ALTER TABLE custom_feature_items ENABLE ROW LEVEL SECURITY;

-- Apply Tenant Isolation Policy
CREATE POLICY tenant_isolation_custom_feature_items ON custom_feature_items
    FOR ALL
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::BIGINT
        OR current_setting('app.current_tenant_id', true) = '1'
    );
```

### Step 3: Repository Definition
```java
package com.acrovix.admin.repository;

import com.acrovix.admin.entity.CustomFeatureItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomFeatureItemRepository extends JpaRepository<CustomFeatureItem, Long> {
    List<CustomFeatureItem> findByTenantId(Long tenantId);
}
```

---

## 7. Operational Checklist & Runbook

### Health Checks
- **Backend API**: `http://localhost:8081/actuator/health` or public ping `/api/v1/public/tenants/default/branding`
- **Frontend SPA**: `http://localhost:5173/`

### Production Build Validation
```bash
# Backend Production Packaging
cd Admin/admin-backend
mvn clean package -DskipTests

# Frontend Production Bundling
cd ../admin-frontend
npm run build
```
