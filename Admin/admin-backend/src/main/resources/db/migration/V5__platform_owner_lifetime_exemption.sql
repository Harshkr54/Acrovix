-- ==============================================================================
-- V5__platform_owner_lifetime_exemption.sql
-- Multi-Tenant SaaS Transformation: Step 4 - Platform Owner Lifetime Exemption
-- ==============================================================================

-- 1. Ensure Tenant 1 is Acrovix Innovations
UPDATE tenants
SET company_name = 'Acrovix Innovations'
WHERE id = 1 AND company_name = 'Acrovix Default Workspace';

-- 2. Ensure Tenant 1 Subscription is LIFETIME_INTERNAL with unlimited quotas
UPDATE tenant_subscriptions
SET plan_tier = 'LIFETIME_INTERNAL',
    max_seats = 999999,
    max_storage_bytes = 9223372036854775807,
    valid_until = '9999-12-31 23:59:59',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 1;

-- 3. If Tenant 1 subscription doesn't exist, insert with LIFETIME_INTERNAL
INSERT INTO tenant_subscriptions (tenant_id, plan_tier, max_seats, max_storage_bytes, valid_until, updated_at)
SELECT 1, 'LIFETIME_INTERNAL', 999999, 9223372036854775807, '9999-12-31 23:59:59', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM tenant_subscriptions WHERE tenant_id = 1);
