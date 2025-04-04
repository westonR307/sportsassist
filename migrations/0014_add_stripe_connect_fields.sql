-- Add Stripe Connect fields to organizations table
ALTER TABLE organizations 
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_details_submitted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_account_charges_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_account_payouts_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_fee_passthrough BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stripe_platform_fee_percent NUMERIC DEFAULT 15;