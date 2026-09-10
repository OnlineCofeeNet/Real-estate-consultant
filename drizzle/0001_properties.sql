-- ============================================================
-- Migration: ماژول املاک (Properties)
-- جداول: areas, properties, property_images
-- اجرا: psql -U <user> -d <database> -f drizzle/0001_properties.sql
-- ============================================================

-- مناطق / محله‌ها
CREATE TABLE IF NOT EXISTS areas (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  parent_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT
);

-- جدول اصلی املاک
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,

  -- شناسه و عنوان
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,

  -- نوع و وضعیت
  property_type TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',

  -- قیمت‌ها (ریال)
  price INTEGER,
  deposit INTEGER,
  rent INTEGER,

  -- مشخصات فیزیکی
  area REAL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  floor INTEGER,
  total_floors INTEGER,
  year_built INTEGER,
  parking_spaces INTEGER DEFAULT 0,

  -- موقعیت
  address TEXT,
  area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
  latitude REAL,
  longitude REAL,

  -- امکانات (JSON array)
  features JSONB,

  -- توضیحات
  description TEXT,
  notes TEXT,

  -- روابط
  owner_id INTEGER,
  assigned_agent_id INTEGER,

  -- تاریخ‌ها
  listed_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

-- تصاویر ملک
CREATE TABLE IF NOT EXISTS property_images (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT
);

-- ایندکس‌های کاربردی
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_property_type ON properties(property_type);
CREATE INDEX IF NOT EXISTS idx_properties_transaction_type ON properties(transaction_type);
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_properties_area_id ON properties(area_id);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
