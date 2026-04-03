-- Migration: Create cleaner_payments table for tracking cash payments to cleaners

CREATE TABLE IF NOT EXISTS cleaner_payments (
  id SERIAL PRIMARY KEY,
  cleaner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cleaner_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on cleaner_payments"
  ON cleaner_payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Cleaners can view their own payments"
  ON cleaner_payments FOR SELECT
  USING (cleaner_id = auth.uid());
