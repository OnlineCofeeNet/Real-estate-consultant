-- =============================================
-- Migration: Multi-Agency Support
-- Date: 2026-09-11
-- =============================================

-- 1. جدول agencies
CREATE TABLE IF NOT EXISTS agencies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_base64 TEXT,
  slogan TEXT,
  phone1 TEXT,
  phone2 TEXT,
  email TEXT,
  address TEXT,
  national_id TEXT,
  economic_code TEXT,
  domain TEXT,
  plan TEXT NOT NULL DEFAULT 'basic',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

-- 2. جدول واسط user_agencies
CREATE TABLE IF NOT EXISTS user_agencies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agency_id INTEGER NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at BIGINT,
  UNIQUE(user_id, agency_id)
);

-- 3. اضافه کردن ستون‌های agencyId (nullable ابتدا)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS property_id INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party2_share_percent INTEGER DEFAULT 50;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party1_paid_amount INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS party2_paid_amount INTEGER DEFAULT 0;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS agency_id INTEGER;

ALTER TABLE properties ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE property_requests ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE message_logs ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS agency_id INTEGER;
ALTER TABLE areas ADD COLUMN IF NOT EXISTS agency_id INTEGER;

ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_agency_id INTEGER;

-- 4. ایجاد آژانس پیش‌فرض و پر کردن داده‌ها
DO $$
DECLARE
  default_agency_id INTEGER;
  current_settings JSONB;
BEGIN
  SELECT data INTO current_settings FROM settings LIMIT 1;

  INSERT INTO agencies (name, slug, plan, is_active, settings, created_at)
  VALUES (
    COALESCE((current_settings->>'agencyName'), 'آژانس پیش‌فرض'),
    'default',
    'pro',
    true,
    current_settings,
    (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  )
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO default_agency_id;

  IF default_agency_id IS NULL THEN
    SELECT id INTO default_agency_id FROM agencies WHERE slug = 'default' LIMIT 1;
  END IF;

  UPDATE customers SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE contracts SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE invoices SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE payments SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE properties SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE property_requests SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE message_logs SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE audit_logs SET agency_id = default_agency_id WHERE agency_id IS NULL;
  UPDATE areas SET agency_id = default_agency_id WHERE agency_id IS NULL;

  INSERT INTO user_agencies (user_id, agency_id, role, is_active, created_at)
  SELECT id, default_agency_id, role, true, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  FROM users
  ON CONFLICT (user_id, agency_id) DO NOTHING;

  UPDATE users SET primary_agency_id = default_agency_id WHERE primary_agency_id IS NULL;
END $$;

-- 5. سخت‌گیری (NOT NULL + Index + Unique)
ALTER TABLE customers ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE contracts ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE invoices ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE payments ALTER COLUMN agency_id SET NOT NULL;
ALTER TABLE properties ALTER COLUMN agency_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS customers_agency_idx ON customers(agency_id);
CREATE INDEX IF NOT EXISTS contracts_agency_idx ON contracts(agency_id);
CREATE INDEX IF NOT EXISTS invoices_agency_idx ON invoices(agency_id);
CREATE INDEX IF NOT EXISTS properties_agency_idx ON properties(agency_id);

CREATE UNIQUE INDEX IF NOT EXISTS contract_number_agency_unique 
  ON contracts(agency_id, contract_number);

CREATE UNIQUE INDEX IF NOT EXISTS property_code_agency_unique 
  ON properties(agency_id, code);
