-- V9__add_public_esign_and_audit_logs.sql
-- Adds public e-signature columns to quotations and creates entity_audit_logs table with RLS

-- 1. Add public token and e-sign acceptance columns to quotations
ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS public_token VARCHAR(64),
    ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS signer_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS signer_ip VARCHAR(64),
    ADD COLUMN IF NOT EXISTS signature_data TEXT,
    ADD COLUMN IF NOT EXISTS signer_notes TEXT;

-- Backfill public_token for existing quotations if null
UPDATE quotations 
SET public_token = COALESCE(client_token, md5(random()::text || clock_timestamp()::text || id::text))
WHERE public_token IS NULL;

-- Create unique index on public_token
CREATE UNIQUE INDEX IF NOT EXISTS uq_quotations_public_token ON quotations(public_token) WHERE public_token IS NOT NULL;

-- 2. Create immutable entity_audit_logs table
CREATE TABLE IF NOT EXISTS entity_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by_name VARCHAR(150),
    details TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_audit_logs_lookup 
    ON entity_audit_logs(tenant_id, entity_type, entity_id, created_at DESC);

-- 3. Enable PostgreSQL Row-Level Security (RLS) on entity_audit_logs
ALTER TABLE entity_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_entity_audit_logs ON entity_audit_logs;
CREATE POLICY tenant_isolation_entity_audit_logs ON entity_audit_logs FOR ALL USING (
    tenant_id = (
        CASE 
            WHEN current_setting('app.current_tenant_id', true) IS NULL 
              OR current_setting('app.current_tenant_id', true) = '' THEN NULL 
            ELSE current_setting('app.current_tenant_id', true)::BIGINT 
        END
    )
    OR current_setting('app.current_tenant_id', true) = 'BYPASS_RLS'
) WITH CHECK (
    tenant_id = (
        CASE 
            WHEN current_setting('app.current_tenant_id', true) IS NULL 
              OR current_setting('app.current_tenant_id', true) = '' THEN NULL 
            ELSE current_setting('app.current_tenant_id', true)::BIGINT 
        END
    )
    OR current_setting('app.current_tenant_id', true) = 'BYPASS_RLS'
);
