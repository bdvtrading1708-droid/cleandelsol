-- Migration: Create job_cleaners junction table for multi-cleaner support
-- Run this in the Supabase SQL Editor

-- 1. Create the junction table
CREATE TABLE IF NOT EXISTS job_cleaners (
  id SERIAL PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  cleaner_id UUID NOT NULL REFERENCES users(id),
  cleaner_payout NUMERIC,
  start_time TEXT,
  end_time TEXT,
  hours_worked NUMERIC,
  km_driven NUMERIC
);

-- 2. Migrate existing data from jobs to job_cleaners
INSERT INTO job_cleaners (job_id, cleaner_id, cleaner_payout, start_time, end_time, hours_worked, km_driven)
SELECT id, cleaner_id, cleaner_payout, start_time, end_time, hours_worked, km_driven
FROM jobs
WHERE cleaner_id IS NOT NULL;

-- 3. Enable RLS
ALTER TABLE job_cleaners ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (same pattern as jobs table)
CREATE POLICY "Admins can do everything on job_cleaners"
  ON job_cleaners FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Cleaners can view their own job_cleaners"
  ON job_cleaners FOR SELECT
  USING (cleaner_id = auth.uid());

CREATE POLICY "Cleaners can update their own job_cleaners"
  ON job_cleaners FOR UPDATE
  USING (cleaner_id = auth.uid());

-- 5. Remove old columns from jobs (do this AFTER verifying the migration works)
-- Uncomment these lines after testing:
-- ALTER TABLE jobs DROP COLUMN IF EXISTS cleaner_id;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS cleaner_payout;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS km_driven;
-- ALTER TABLE jobs DROP COLUMN IF EXISTS hours_worked;
