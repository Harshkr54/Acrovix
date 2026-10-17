-- ============================================================================
-- V6: Add Branding and White-Labeling Fields to Company Settings Table
-- ============================================================================

ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS brand_name VARCHAR(150);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(50) DEFAULT '#2563EB';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(50) DEFAULT '#1E40AF';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS currency_code VARCHAR(10) DEFAULT 'INR';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS currency_symbol VARCHAR(10) DEFAULT '₹';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Asia/Kolkata';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS date_format VARCHAR(30) DEFAULT 'YYYY-MM-DD';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS favicon_url VARCHAR(255);

-- Backfill brand_name from company_name where missing
UPDATE company_settings 
SET brand_name = company_name 
WHERE brand_name IS NULL OR brand_name = '';
