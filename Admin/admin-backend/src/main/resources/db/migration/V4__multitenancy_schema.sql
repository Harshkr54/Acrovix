-- ==============================================================================
-- V4__multitenancy_schema.sql
-- Multi-Tenant SaaS Transformation: Core Tenancy, Isolation & Row-Level Security
-- ==============================================================================

-- 1. Create top-level tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    custom_domain VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain);

-- 2. Create tenant_subscriptions table
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    plan_tier VARCHAR(50) NOT NULL DEFAULT 'STARTER',
    max_seats INT NOT NULL DEFAULT 5,
    max_storage_bytes BIGINT NOT NULL DEFAULT 5368709120, -- 5 GB
    valid_until TIMESTAMP WITHOUT TIME ZONE,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tier ON tenant_subscriptions(plan_tier);

-- 3. Seed Root / Default Tenant (ID = 1) for historical data backfill
INSERT INTO tenants (id, slug, company_name, status, created_at, updated_at)
VALUES (1, 'default', 'Acrovix Default Workspace', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

INSERT INTO tenant_subscriptions (tenant_id, plan_tier, max_seats, max_storage_bytes, valid_until, updated_at)
VALUES (1, 'ENTERPRISE', 100, 107374182400, CURRENT_TIMESTAMP + INTERVAL '10 years', CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id) DO NOTHING;

-- Synchronize tenant sequence counter
SELECT setval(
    pg_get_serial_sequence('tenants', 'id'), 
    COALESCE((SELECT MAX(id) FROM tenants), 1), 
    true
);

-- 4. Add tenant_id to all 22 tenant-scoped tables, backfill to 1, enforce NOT NULL, and index
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'admin_users',
        'password_reset_tokens',
        'crm_leads',
        'crm_follow_ups',
        'customers',
        'enquiries',
        'quotations',
        'quotation_items',
        'quotation_column_configs',
        'purchase_orders',
        'invoices',
        'invoice_items',
        'payments',
        'company_settings',
        'company_bank_accounts',
        'tax_masters',
        'sequence_tracker',
        'product_service_catalog',
        'automation_job_runs',
        'email_logs',
        'invoice_reminder_deliveries',
        'admin_activities',
        'admin_notifications',
        'notifications'
    ];
    fk_name text;
    idx_tenant text;
    idx_composite text;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Only proceed if the table exists in public schema
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            
            -- Add column if not present
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id BIGINT;', tbl);
            
            -- Backfill existing rows to root tenant 1
            EXECUTE format('UPDATE %I SET tenant_id = 1 WHERE tenant_id IS NULL;', tbl);
            
            -- Enforce NOT NULL constraint
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL;', tbl);
            
            -- Foreign key constraint referencing tenants(id)
            fk_name := 'fk_' || left(tbl, 50) || '_tenant';
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk_name) THEN
                EXECUTE format(
                    'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;', 
                    tbl, fk_name
                );
            END IF;
            
            -- Index on tenant_id
            idx_tenant := 'idx_' || left(tbl, 50) || '_tenant_id';
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(tenant_id);', idx_tenant, tbl);
            
            -- Composite index on (tenant_id, id)
            idx_composite := 'idx_' || left(tbl, 47) || '_tid_id';
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(tenant_id, id);', idx_composite, tbl);
            
        END IF;
    END LOOP;
END $$;

-- 5. Scope sequence_tracker unique constraint per tenant
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sequence_tracker') THEN
        -- Drop single-column unique constraint on sequence_name if present
        ALTER TABLE sequence_tracker DROP CONSTRAINT IF EXISTS sequence_tracker_sequence_name_key;
        ALTER TABLE sequence_tracker DROP CONSTRAINT IF EXISTS uk_sequence_tracker_sequence_name;
        
        -- Create composite unique index (tenant_id, sequence_name)
        CREATE UNIQUE INDEX IF NOT EXISTS uq_sequence_tracker_tenant_sequence 
            ON sequence_tracker(tenant_id, sequence_name);
    END IF;
END $$;

-- 6. Enable PostgreSQL Row-Level Security (RLS) on critical transactional tables
-- Uses PostgreSQL session variable 'app.current_tenant_id'
DO $$
DECLARE
    rls_tables text[] := ARRAY['quotations', 'invoices', 'purchase_orders', 'payments'];
    tbl text;
    policy_name text;
BEGIN
    FOREACH tbl IN ARRAY rls_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
            
            policy_name := 'tenant_isolation_' || tbl;
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I;', policy_name, tbl);
            
            EXECUTE format(
                'CREATE POLICY %I ON %I FOR ALL USING (
                    tenant_id = (
                        CASE 
                            WHEN current_setting(''app.current_tenant_id'', true) IS NULL 
                              OR current_setting(''app.current_tenant_id'', true) = '''' THEN NULL 
                            ELSE current_setting(''app.current_tenant_id'', true)::BIGINT 
                        END
                    )
                    OR current_setting(''app.current_tenant_id'', true) = ''BYPASS_RLS''
                ) WITH CHECK (
                    tenant_id = (
                        CASE 
                            WHEN current_setting(''app.current_tenant_id'', true) IS NULL 
                              OR current_setting(''app.current_tenant_id'', true) = '''' THEN NULL 
                            ELSE current_setting(''app.current_tenant_id'', true)::BIGINT 
                        END
                    )
                    OR current_setting(''app.current_tenant_id'', true) = ''BYPASS_RLS''
                );',
                policy_name, tbl
            );
        END IF;
    END LOOP;
END $$;
