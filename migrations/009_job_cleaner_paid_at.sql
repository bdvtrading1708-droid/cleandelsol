-- Migration: Add per-cleaner payment tracking
-- This allows marking individual cleaners as paid on multi-cleaner jobs

-- 1. Add paid_at column to job_cleaners
ALTER TABLE job_cleaners ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Backfill: for jobs already marked as 'done', set paid_at on all their job_cleaners
UPDATE job_cleaners
SET paid_at = jobs.paid_at
FROM jobs
WHERE job_cleaners.job_id = jobs.id
  AND jobs.status = 'done'
  AND jobs.paid_at IS NOT NULL
  AND job_cleaners.paid_at IS NULL;

-- 3. Also backfill invoiced jobs (they were paid too)
UPDATE job_cleaners
SET paid_at = COALESCE(jobs.paid_at, NOW())
FROM jobs
WHERE job_cleaners.job_id = jobs.id
  AND jobs.status = 'invoiced'
  AND job_cleaners.paid_at IS NULL;
