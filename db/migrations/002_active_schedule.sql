-- ─────────────────────────────────────────────────────────────
-- Migration 002 – Add schedule columns to products
-- Run: psql -d preisgucken -f db/migrations/002_active_schedule.sql
-- ─────────────────────────────────────────────────────────────

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS active_from  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_products_active_from  ON products(active_from);
CREATE INDEX IF NOT EXISTS idx_products_active_until ON products(active_until);

CREATE INDEX IF NOT EXISTS idx_products_schedule
  ON products(active_from, active_until)
  WHERE active_until IS NULL OR active_until > NOW();
