-- Flyway Migration V8: Allow COMPANY_ADMIN in admin_users role constraint

ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users ADD CONSTRAINT admin_users_role_check 
    CHECK (role IN ('SUPER_ADMIN', 'COMPANY_ADMIN', 'SALES', 'EDITOR'));
