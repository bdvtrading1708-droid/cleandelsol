-- Trigger: automatically transition job status based on cleaner submissions
-- When a cleaner submits hours (hours_worked updated from NULL to a value):
--   - If ALL cleaners have submitted → status = 'delivered'
--   - If not all done yet → status = 'progress' (if was 'planned')
-- This runs as SECURITY DEFINER to bypass RLS on job_cleaners.

CREATE OR REPLACE FUNCTION check_all_cleaners_delivered()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act when hours_worked is set (cleaner submitting hours)
  IF NEW.hours_worked IS NOT NULL AND (OLD.hours_worked IS NULL OR OLD.hours_worked = 0) THEN
    -- Check if ALL cleaners for this job now have hours_worked
    IF NOT EXISTS (
      SELECT 1 FROM job_cleaners
      WHERE job_id = NEW.job_id
      AND (hours_worked IS NULL OR hours_worked = 0)
    ) THEN
      -- All cleaners done → set status to 'delivered'
      UPDATE jobs SET status = 'delivered' WHERE id = NEW.job_id;
    ELSE
      -- Not all done yet → ensure status is at least 'progress'
      UPDATE jobs SET status = 'progress'
      WHERE id = NEW.job_id AND status = 'planned';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_check_all_cleaners_delivered
  AFTER UPDATE ON job_cleaners
  FOR EACH ROW
  EXECUTE FUNCTION check_all_cleaners_delivered();
