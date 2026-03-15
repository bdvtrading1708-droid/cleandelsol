-- Add laundry_cost column to jobs table
-- Laundry is a client charge (revenue), not included in cleaner payouts
ALTER TABLE jobs ADD COLUMN laundry_cost numeric DEFAULT 0;
