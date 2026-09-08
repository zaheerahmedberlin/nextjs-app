-- ─────────────────────────────────────────────────────────────
-- Migration 007 – Price alerts
-- Run: psql -d preisgucken -f db/migrations/007_price_alerts.sql
--
-- Backfills a table the app code already assumed existed:
-- app/api/price-alerts/route.js inserts into it and
-- app/api/cron/check-price-alerts/route.js reads from it, but no
-- CREATE TABLE was ever committed — the cron route has been failing
-- with "relation price_alerts does not exist" in production the
-- whole time (confirmed on both Railway and the netcup restore
-- during the 2026-09 migration). One active alert per email+product,
-- enforced by the UNIQUE constraint the insert route's
-- "ON CONFLICT DO NOTHING" already assumed was there.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS price_alerts (
  id           SERIAL PRIMARY KEY,
  email        TEXT NOT NULL,
  product_id   BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_price NUMERIC(10,2) NOT NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (email, product_id)
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_price_alerts_product ON price_alerts(product_id);
