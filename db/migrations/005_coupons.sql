-- ─────────────────────────────────────────────────────────────
-- Migration 005 – Coupons / voucher codes
-- Run: psql -d preisgucken -f db/migrations/005_coupons.sql
--
-- Deliberately vendor-agnostic: vendor_id points at the same
-- `vendors` table used for both AWIN vendors (awin_merchant_id set)
-- and direct/CPC vendors (billing_rate set) — a coupon's tracking_url
-- reuses whatever affiliate/CPC link already applies to that vendor,
-- clicks flow through the existing /api/track → click_events pipeline
-- exactly like a product link, so no separate billing logic is needed.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coupons (
  id             SERIAL PRIMARY KEY,
  vendor_id      INT NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  code           TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  discount_type  TEXT NOT NULL DEFAULT 'percent',  -- percent | fixed
  discount_value NUMERIC(10,2),
  valid_from     TIMESTAMPTZ,
  valid_until    TIMESTAMPTZ,
  tracking_url   TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  source         TEXT NOT NULL DEFAULT 'manual',   -- manual | awin_api
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_vendor_id ON coupons(vendor_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active_window ON coupons(is_active, valid_from, valid_until);
