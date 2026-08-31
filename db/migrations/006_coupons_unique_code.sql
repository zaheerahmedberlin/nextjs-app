-- ─────────────────────────────────────────────────────────────
-- Migration 006 – Unique (vendor_id, code) on coupons
-- Run: psql -d preisgucken -f db/migrations/006_coupons_unique_code.sql
--
-- Without this, re-opening the AWIN import modal and re-selecting an
-- already-imported offer silently creates a duplicate row — nothing
-- stopped it before. Verified against production first (SELECT vendor_id,
-- code, COUNT(*) ... HAVING COUNT(*) > 1 returned zero rows) so this is
-- safe to apply as a hard constraint, not just an index.
-- ─────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_vendor_code_unique ON coupons(vendor_id, code);
