-- Allow jobs to override pricing type (hourly vs fixed) from the property default
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pricing_type TEXT CHECK (pricing_type IN ('hourly', 'fixed'));

-- Allow jobs without a linked property (for one-time / non-registered clients)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS custom_property_name TEXT;
ALTER TABLE jobs ALTER COLUMN property_id DROP NOT NULL;
