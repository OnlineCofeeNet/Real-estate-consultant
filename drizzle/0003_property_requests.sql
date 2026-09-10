-- درخواست ملک مشتری (برای مچ با فایل‌های املاک)
CREATE TABLE IF NOT EXISTS property_requests (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  title TEXT,
  transaction_type TEXT NOT NULL,       -- sale | rent | mortgage | rent_mortgage
  property_type TEXT,                  -- apartment | villa | ...
  status TEXT NOT NULL DEFAULT 'open',  -- open | matched | closed | archived

  -- بازه بودجه / قیمت
  min_price INTEGER,
  max_price INTEGER,
  min_deposit INTEGER,
  max_deposit INTEGER,
  min_rent INTEGER,
  max_rent INTEGER,

  -- مشخصات فیزیکی
  min_area REAL,
  max_area REAL,
  min_bedrooms INTEGER,
  max_bedrooms INTEGER,

  -- موقعیت و امکانات
  area_id INTEGER,
  preferred_areas JSONB,               -- آرایه نام محله‌ها یا id
  features JSONB,                      -- امکانات مطلوب

  description TEXT,
  notes TEXT,                          -- یادداشت مشاور
  assigned_agent_id INTEGER,

  created_at BIGINT,
  updated_at BIGINT,
  expires_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_property_requests_customer ON property_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_property_requests_status ON property_requests(status);
CREATE INDEX IF NOT EXISTS idx_property_requests_tx ON property_requests(transaction_type);

-- تاریخچه پیشنهاد / ارسال فایل به مشتری
CREATE TABLE IF NOT EXISTS property_shares (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  request_id INTEGER,
  channel TEXT NOT NULL,               -- telegram | bale | rubika | sms
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  match_score INTEGER,                 -- 0..100
  created_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_property_shares_customer ON property_shares(customer_id);
CREATE INDEX IF NOT EXISTS idx_property_shares_property ON property_shares(property_id);
