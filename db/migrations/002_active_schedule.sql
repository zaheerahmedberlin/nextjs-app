-- ─────────────────────────────────────────────────────────────
-- Migration 002 – Replace is_active boolean with date range
-- Run: psql -d preisgucken -f db/migrations/002_active_schedule.sql
-- ─────────────────────────────────────────────────────────────

-- Step 1: Add the new schedule columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS active_from  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ DEFAULT NULL;  -- NULL = no end date

-- Step 2: Migrate existing is_active values
-- Products that were active → active_from = created_at, no end date
-- Products that were inactive → active_until = NOW() (already expired)
UPDATE products SET
  active_from  = created_at,
  active_until = CASE WHEN is_active = FALSE THEN created_at ELSE NULL END;

-- Step 3: Add a generated column "is_active" that computes from the schedule
-- This keeps backward compatibility — all existing code using is_active still works
ALTER TABLE products DROP COLUMN IF EXISTS is_active;

ALTER TABLE products ADD COLUMN is_active BOOLEAN
  GENERATED ALWAYS AS (
    NOW() >= active_from
    AND (active_until IS NULL OR NOW() < active_until)
  ) STORED;

-- Step 4: Indexes for schedule queries
CREATE INDEX IF NOT EXISTS idx_products_active_from  ON products(active_from);
CREATE INDEX IF NOT EXISTS idx_products_active_until ON products(active_until);

-- Composite index for the common "show me currently active products" query
CREATE INDEX IF NOT EXISTS idx_products_schedule
  ON products(active_from, active_until)
  WHERE active_until IS NULL OR active_until > NOW();
