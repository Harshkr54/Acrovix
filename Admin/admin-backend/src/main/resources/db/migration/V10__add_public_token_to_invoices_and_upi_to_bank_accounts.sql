-- V10__add_public_token_to_invoices_and_upi_to_bank_accounts.sql
-- Adds public_token to invoices and upi_id to company_bank_accounts

-- 1. Add public_token to invoices
ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS public_token VARCHAR(100);

-- Backfill public_token for existing invoices
UPDATE invoices
SET public_token = md5(random()::text || clock_timestamp()::text || id::text)
WHERE public_token IS NULL;

-- Create unique index on invoices(public_token)
CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_public_token ON invoices(public_token) WHERE public_token IS NOT NULL;

-- 2. Add upi_id to company_bank_accounts
ALTER TABLE company_bank_accounts
    ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
