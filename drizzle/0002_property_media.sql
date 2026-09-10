-- رسانه املاک (عکس و فیلم)
CREATE TABLE IF NOT EXISTS property_media (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  type TEXT NOT NULL,              -- image | video
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  original_name TEXT,
  width INTEGER,
  height INTEGER,
  duration INTEGER,               -- ثانیه برای ویدیو
  caption TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_property_media_property_id ON property_media(property_id);
CREATE INDEX IF NOT EXISTS idx_property_media_type ON property_media(type);
CREATE INDEX IF NOT EXISTS idx_property_media_is_primary ON property_media(is_primary);
