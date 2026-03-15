-- Add per-cleaner extra costs column
ALTER TABLE job_cleaners ADD COLUMN IF NOT EXISTS extra_costs NUMERIC DEFAULT 0;
