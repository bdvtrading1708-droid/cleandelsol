-- Add payment_note to job_cleaners for noting remaining balance etc.
ALTER TABLE job_cleaners ADD COLUMN IF NOT EXISTS payment_note TEXT;
