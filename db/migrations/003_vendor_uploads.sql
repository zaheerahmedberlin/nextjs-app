-- ─────────────────────────────────────────────────────────────
-- Migration 003 – Vendor file uploads + column mapping
-- Run: psql -d preisgucken -f db/migrations/003_vendor_uploads.sql
-- ─────────────────────────────────────────────────────────────

-- Add password + column mapping to vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS email         TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS column_mappings JSONB;

-- ── Vendor Uploads ───────────────────────────────────────────
-- Raw file bytes are stored temporarily; nulled after processing.
-- Metadata row is kept forever for audit/history.
CREATE TABLE IF NOT EXISTS vendor_uploads (
  id             SERIAL PRIMARY KEY,
  vendor_id      INT REFERENCES vendors(id) ON DELETE CASCADE,
  original_name  TEXT NOT NULL,
  file_size      BIGINT,
  mime_type      TEXT,                        -- text/csv or application/vnd.openxmlformats...
  file_data      BYTEA,                       -- nulled after worker processes the file
  column_mapping JSONB,                       -- snapshot of mapping used for this upload
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | error
  total_rows     INT,
  processed_rows INT DEFAULT 0,
  skipped_rows   INT DEFAULT 0,
  error_log      TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_uploads_vendor_id ON vendor_uploads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_uploads_status    ON vendor_uploads(status);

-- Unique constraint for upsert in worker (vendor_id + external_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_vendor_external
  ON products(vendor_id, external_id)
  WHERE external_id IS NOT NULL;
