-- Add address/billing fields to partners
ALTER TABLE partners ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'España';
ALTER TABLE partners ADD COLUMN IF NOT EXISTS tax_number TEXT;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  partner_id UUID REFERENCES partners(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  total_amount NUMERIC DEFAULT 0,
  pdf_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'paid'))
);

-- Junction table linking invoices to jobs
CREATE TABLE IF NOT EXISTS invoice_jobs (
  invoice_id INT REFERENCES invoices(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  PRIMARY KEY (invoice_id, job_id)
);
