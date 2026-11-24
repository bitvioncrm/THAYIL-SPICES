-- Simplified Thayil Cardamom Farmer & Billing schema (optional Supabase upgrade)

CREATE TABLE IF NOT EXISTS simple_farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  address TEXT,
  plantation_name TEXT,
  plantation_location TEXT,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  default_rate NUMERIC(12,2) NOT NULL DEFAULT 15,
  rate_method TEXT NOT NULL DEFAULT 'per_green_kg'
    CHECK (rate_method IN ('per_green_kg','per_dry_kg','per_bag','fixed_daily','custom')),
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES simple_farmers(id),
  entry_date DATE NOT NULL,
  green_kg NUMERIC(14,3) NOT NULL CHECK (green_kg >= 0),
  dry_kg NUMERIC(14,3) NOT NULL CHECK (dry_kg >= 0),
  loss_kg NUMERIC(14,3) NOT NULL,
  bags INTEGER,
  rate NUMERIC(12,2) NOT NULL,
  rate_method TEXT NOT NULL,
  labour_charge NUMERIC(14,2) NOT NULL,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  notes TEXT,
  billed_bill_id UUID,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_farmer_date ON daily_entries (farmer_id, entry_date);

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES simple_farmers(id),
  period_type TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  bill_date DATE NOT NULL,
  total_green_kg NUMERIC(14,3) NOT NULL,
  total_dry_kg NUMERIC(14,3) NOT NULL,
  total_loss_kg NUMERIC(14,3) NOT NULL,
  total_charges NUMERIC(14,2) NOT NULL,
  previous_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  payments_in_period NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid_on_bill NUMERIC(14,2) NOT NULL DEFAULT 0,
  current_bill_amount NUMERIC(14,2) NOT NULL,
  final_balance NUMERIC(14,2) NOT NULL,
  payment_status TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','finalized','cancelled')),
  entry_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  finalized_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE daily_entries
  DROP CONSTRAINT IF EXISTS daily_entries_billed_bill_id_fkey;
ALTER TABLE daily_entries
  ADD CONSTRAINT daily_entries_billed_bill_id_fkey
  FOREIGN KEY (billed_bill_id) REFERENCES bills(id);

CREATE TABLE IF NOT EXISTS simple_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES simple_farmers(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  linked_bill_id UUID REFERENCES bills(id),
  notes TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
