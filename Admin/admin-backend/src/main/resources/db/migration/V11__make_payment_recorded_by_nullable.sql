-- V11: Allow null recorded_by in payments table for client-submitted public proofs and external webhook reconciliations
ALTER TABLE payments ALTER COLUMN recorded_by DROP NOT NULL;
