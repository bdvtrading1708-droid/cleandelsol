-- Add welcome_email_sent column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS welcome_email_sent boolean DEFAULT false;
