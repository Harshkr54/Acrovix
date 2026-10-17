-- ============================================================================
-- V7: Add missing columns vat_id and signature_url to company_settings table
-- ============================================================================

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS vat_id VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS signature_url VARCHAR(255);
