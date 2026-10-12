-- V2__add_quotation_bank_details_and_company_bank_accounts.sql
-- Adds dedicated company_bank_accounts table and snapshot bank columns to quotations

CREATE TABLE IF NOT EXISTS company_bank_accounts (
    id BIGSERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_holder VARCHAR(150) NOT NULL,
    bank_account_number VARCHAR(50) NOT NULL,
    bank_ifsc VARCHAR(20) NOT NULL,
    bank_branch VARCHAR(100),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE
);

-- Seed initial company bank account from company_settings if present
INSERT INTO company_bank_accounts (bank_name, account_holder, bank_account_number, bank_ifsc, bank_branch, is_default, is_active, created_at)
SELECT 
    bank_name,
    COALESCE(company_name, 'ACROVIX INNOVATIONS PRIVATE LIMITED'),
    bank_account_number,
    bank_ifsc,
    bank_branch,
    TRUE,
    TRUE,
    CURRENT_TIMESTAMP
FROM company_settings
WHERE bank_account_number IS NOT NULL AND bank_account_number != '';

-- Add snapshot bank columns to quotations table
ALTER TABLE quotations
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS bank_account_holder VARCHAR(150),
    ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20),
    ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100),
    ADD COLUMN IF NOT EXISTS company_bank_account_id BIGINT;
