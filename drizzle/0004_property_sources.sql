ALTER TABLE properties ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'agency';
ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;
ALTER TABLE property_requests ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'agency';
ALTER TABLE property_requests ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_properties_source ON properties(source);
CREATE INDEX IF NOT EXISTS idx_property_requests_source ON property_requests(source);
CREATE INDEX IF NOT EXISTS idx_property_requests_open_tx ON property_requests(status, transaction_type);
