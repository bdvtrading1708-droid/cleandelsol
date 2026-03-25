-- Add custom_address field to jobs for one-time/temporary clients without a property record
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_address TEXT;
