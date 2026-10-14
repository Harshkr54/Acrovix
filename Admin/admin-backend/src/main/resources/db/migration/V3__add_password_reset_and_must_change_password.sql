-- V3__add_password_reset_and_must_change_password.sql
-- Flyway migration for ACROVIX Admin Account Recovery & Password Reset

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    admin_user_id BIGINT NOT NULL,
    expiry_date TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_admin_user FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(admin_user_id);

-- Add forced password change flag to admin_users
ALTER TABLE admin_users 
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Allow admin_user_id in admin_activities to be nullable for unauthenticated events (e.g., LOGIN_FAILED)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'admin_activities' AND column_name = 'admin_user_id' AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE admin_activities ALTER COLUMN admin_user_id DROP NOT NULL;
    END IF;
END $$;

-- Update email_logs check constraint to allow PASSWORD_RESET
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'email_logs_email_type_check'
    ) THEN
        ALTER TABLE email_logs DROP CONSTRAINT email_logs_email_type_check;
        ALTER TABLE email_logs ADD CONSTRAINT email_logs_email_type_check 
            CHECK (email_type IN (
                'QUOTATION', 'INVOICE', 'PAYMENT_RECEIPT', 'CRM_LEAD', 'FOLLOW_UP', 
                'LOGIN_SECURITY', 'WELCOME', 'ENQUIRY', 'ENQUIRY_ASSIGNMENT', 
                'CRM_LEAD_ASSIGNMENT', 'FOLLOW_UP_DUE', 'FOLLOW_UP_OVERDUE', 
                'QUOTATION_RESPONSE', 'PO_NOTIFICATION', 'INVOICE_NOTIFICATION', 
                'INVOICE_OVERDUE', 'PAYMENT_NOTIFICATION', 'PASSWORD_RESET', 'GENERAL'
            ));
    END IF;
END $$;


