-- Thayil Cardamom Spices ERP — PostgreSQL schema for Supabase
-- Apply via Supabase SQL editor or CLI. Keep database private; do not expose service-role keys to the client.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE business_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL DEFAULT 'THAYIL CARDAMOM SPICES',
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  logo_url TEXT,
  farmer_prefix TEXT NOT NULL DEFAULT 'THY-FRM-',
  invoice_prefix TEXT NOT NULL DEFAULT 'THY-INV-',
  receipt_prefix TEXT NOT NULL DEFAULT 'THY-RCV-',
  batch_prefix TEXT NOT NULL DEFAULT 'THY-BTH-',
  purchase_prefix TEXT NOT NULL DEFAULT 'THY-PUR-',
  payment_prefix TEXT NOT NULL DEFAULT 'THY-PAY-',
  expense_prefix TEXT NOT NULL DEFAULT 'THY-EXP-',
  dryer_prefix TEXT NOT NULL DEFAULT 'THY-DRY-',
  drying_rate_per_green_kg NUMERIC(12,2) NOT NULL DEFAULT 15,
  drying_rate_per_dry_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
  fixed_batch_rate NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  date_format TEXT NOT NULL DEFAULT 'dd MMM yyyy',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  language TEXT NOT NULL DEFAULT 'en',
  invoice_footer TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  address TEXT,
  plantation_name TEXT,
  plantation_location TEXT,
  registration_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT farmers_phone_unique UNIQUE (phone)
);

CREATE INDEX idx_farmers_name ON farmers (full_name);
CREATE INDEX idx_farmers_phone ON farmers (phone);

CREATE TABLE dryers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dryer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  capacity_kg NUMERIC(14,3) NOT NULL CHECK (capacity_kg > 0),
  location TEXT,
  status TEXT NOT NULL CHECK (status IN ('available','running','maintenance','inactive')) DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE receiving_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  received_at TIMESTAMPTZ NOT NULL,
  green_weight_kg NUMERIC(14,3) NOT NULL CHECK (green_weight_kg > 0),
  number_of_bags INTEGER NOT NULL CHECK (number_of_bags >= 1),
  bag_weights JSONB,
  quality TEXT NOT NULL CHECK (quality IN ('A','B','C','mixed')),
  staff_name TEXT,
  notes TEXT,
  allocated_kg NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (allocated_kg >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT receiving_allocation_lte_weight CHECK (allocated_kg <= green_weight_kg)
);

CREATE INDEX idx_receiving_farmer ON receiving_records (farmer_id);
CREATE INDEX idx_receiving_date ON receiving_records (received_at);

CREATE TABLE drying_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  receiving_id UUID NOT NULL REFERENCES receiving_records(id),
  dryer_id UUID NOT NULL REFERENCES dryers(id),
  green_input_kg NUMERIC(14,3) NOT NULL CHECK (green_input_kg > 0),
  start_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  dry_output_kg NUMERIC(14,3) CHECK (dry_output_kg IS NULL OR dry_output_kg >= 0),
  drying_loss_kg NUMERIC(14,3),
  yield_percentage NUMERIC(8,3),
  operator TEXT,
  quality TEXT CHECK (quality IN ('A','B','C','mixed')),
  drying_charges NUMERIC(14,2),
  rate_per_green_kg NUMERIC(12,2),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending','assigned','in_progress','completed','delivered','cancelled')) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batches_farmer ON drying_batches (farmer_id);
CREATE INDEX idx_batches_dryer ON drying_batches (dryer_id);
CREATE INDEX idx_batches_status ON drying_batches (status);

CREATE TABLE receiving_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_id UUID NOT NULL REFERENCES receiving_records(id),
  dryer_id UUID NOT NULL REFERENCES dryers(id),
  batch_id UUID NOT NULL REFERENCES drying_batches(id),
  allocated_kg NUMERIC(14,3) NOT NULL CHECK (allocated_kg > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  invoice_date DATE NOT NULL,
  green_input_kg NUMERIC(14,3) NOT NULL DEFAULT 0,
  dry_output_kg NUMERIC(14,3) NOT NULL DEFAULT 0,
  drying_loss_kg NUMERIC(14,3) NOT NULL DEFAULT 0,
  drying_rate NUMERIC(12,2) NOT NULL,
  drying_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
  additional_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
  purchase_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  previous_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid','partial','paid','overpaid')),
  status TEXT NOT NULL CHECK (status IN ('draft','finalized','cancelled','corrected')) DEFAULT 'draft',
  batch_ids UUID[] NOT NULL DEFAULT '{}',
  notes TEXT,
  finalized_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(14,3) NOT NULL,
  rate NUMERIC(14,2) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('drying','purchase','additional','adjustment'))
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  purchase_date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('green','dry')),
  quantity_kg NUMERIC(14,3) NOT NULL CHECK (quantity_kg > 0),
  rate_per_kg NUMERIC(14,2) NOT NULL CHECK (rate_per_kg >= 0),
  gross_amount NUMERIC(14,2) NOT NULL,
  deductions NUMERIC(14,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('unpaid','partial','paid','overpaid')),
  notes TEXT,
  status TEXT NOT NULL CHECK (status IN ('active','cancelled')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_code TEXT NOT NULL UNIQUE,
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  payment_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cash','upi','bank_transfer','other')),
  transaction_ref TEXT,
  linked_invoice_id UUID REFERENCES invoices(id),
  linked_purchase_id UUID REFERENCES purchases(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE farmer_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id),
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('debit','credit')),
  category TEXT NOT NULL CHECK (category IN ('drying_charge','purchase','payment','advance','adjustment','opening')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  reference_type TEXT,
  reference_id UUID,
  description TEXT NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_farmer ON farmer_ledger (farmer_id, created_at);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL CHECK (owner IN ('farmer','store')),
  farmer_id UUID REFERENCES farmers(id),
  kind TEXT NOT NULL CHECK (kind IN ('green','dry')),
  quantity_kg NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (quantity_kg >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT inventory_owner_farmer CHECK (
    (owner = 'store' AND farmer_id IS NULL) OR (owner = 'farmer' AND farmer_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_inventory_store ON inventory (owner, kind) WHERE owner = 'store';
CREATE UNIQUE INDEX idx_inventory_farmer ON inventory (owner, farmer_id, kind) WHERE owner = 'farmer';

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner TEXT NOT NULL CHECK (owner IN ('farmer','store')),
  farmer_id UUID REFERENCES farmers(id),
  kind TEXT NOT NULL CHECK (kind IN ('green','dry')),
  movement_type TEXT NOT NULL,
  quantity_kg NUMERIC(14,3) NOT NULL,
  balance_after NUMERIC(14,3) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_code TEXT NOT NULL UNIQUE,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'electricity','labour','transport','dryer_maintenance','packaging','rent','miscellaneous'
  )),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash','upi','bank_transfer','other')),
  description TEXT NOT NULL,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create','update','delete','finalize','cancel','correct')),
  before JSONB,
  after JSONB,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE id_counters (
  id TEXT PRIMARY KEY DEFAULT 'main',
  farmers INTEGER NOT NULL DEFAULT 0,
  receipts INTEGER NOT NULL DEFAULT 0,
  batches INTEGER NOT NULL DEFAULT 0,
  invoices INTEGER NOT NULL DEFAULT 0,
  purchases INTEGER NOT NULL DEFAULT 0,
  payments INTEGER NOT NULL DEFAULT 0,
  expenses INTEGER NOT NULL DEFAULT 0,
  dryers INTEGER NOT NULL DEFAULT 0
);

INSERT INTO id_counters (id) VALUES ('main') ON CONFLICT DO NOTHING;
INSERT INTO inventory (owner, kind, quantity_kg) VALUES ('store','green',0), ('store','dry',0);

-- IMPORTANT: For a no-login trusted-device deployment, keep Supabase project private
-- and access via a secured backend or local-only architecture. Do NOT set open RLS policies
-- that publicly expose business data. Prefer the IndexedDB local store for single-device use,
-- or a private network + authenticated service role on a server you control.
