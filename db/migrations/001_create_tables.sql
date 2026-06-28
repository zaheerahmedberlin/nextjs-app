-- ─────────────────────────────────────────────────────────────
-- Migration 001 – Core schema for Preisgucken
-- Run: psql -d preisgucken -f db/migrations/001_create_tables.sql
-- ─────────────────────────────────────────────────────────────

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram similarity for fuzzy search
CREATE EXTENSION IF NOT EXISTS unaccent;      -- normalize umlauts: ä→a, ö→o, ü→u

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Vendors / Shops ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  url        TEXT,
  logo_url   TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id           BIGSERIAL PRIMARY KEY,
  external_id  VARCHAR(255),                          -- ID from the source feed
  title        TEXT NOT NULL,
  description  TEXT,
  image        TEXT,
  url          TEXT,
  ean          VARCHAR(20),                           -- barcode — used for Google Shopping
  category_id  INT REFERENCES categories(id),
  category     VARCHAR(255),                          -- denormalised for fast reads
  vendor_id    INT REFERENCES vendors(id),
  vendor       VARCHAR(255),                          -- denormalised
  price        NUMERIC(12, 2) NOT NULL,
  old_price    NUMERIC(12, 2),
  currency     CHAR(3) DEFAULT 'EUR',
  in_stock     BOOLEAN DEFAULT TRUE,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),

  -- Full-text search vector (German) — updated by trigger below
  search_vector TSVECTOR
);

-- ── Offers / Deals ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id           BIGSERIAL PRIMARY KEY,
  product_id   BIGINT REFERENCES products(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  image        TEXT,
  price        NUMERIC(12, 2) NOT NULL,
  old_price    NUMERIC(12, 2),
  category     VARCHAR(255),
  offer_start  TIMESTAMPTZ NOT NULL,
  offer_end    TIMESTAMPTZ NOT NULL,
  type         VARCHAR(50),                           -- e.g. 'deal', 'Black Friday'
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Price history — track price changes over time ─────────────
CREATE TABLE IF NOT EXISTS price_history (
  id         BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
  price      NUMERIC(12, 2) NOT NULL,
  vendor     VARCHAR(255),
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES — critical for performance at scale
-- ─────────────────────────────────────────────────────────────

-- Full-text search index (GIN — fast for tsvector queries)
CREATE INDEX IF NOT EXISTS idx_products_search_vector
  ON products USING GIN(search_vector);

-- Trigram index for ILIKE fallback search
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON products USING GIN(title gin_trgm_ops);

-- Filter indexes
CREATE INDEX IF NOT EXISTS idx_products_category   ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_price      ON products(price);
CREATE INDEX IF NOT EXISTS idx_products_vendor     ON products(vendor);
CREATE INDEX IF NOT EXISTS idx_products_is_active  ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_in_stock   ON products(in_stock);
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_ean        ON products(ean);

-- Composite index for the common "filter + sort by price" query
CREATE INDEX IF NOT EXISTS idx_products_category_price
  ON products(category, price)
  WHERE is_active = TRUE AND in_stock = TRUE;

-- Offer indexes
CREATE INDEX IF NOT EXISTS idx_offers_dates ON offers(offer_start, offer_end);
CREATE INDEX IF NOT EXISTS idx_offers_type  ON offers(type);

-- Price history
CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, recorded_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TRIGGER — auto-update search_vector & updated_at
-- ─────────────────────────────────────────────────────────────

-- Function: rebuild search vector on insert/update
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('german', COALESCE(unaccent(NEW.title), '')), 'A') ||
    setweight(to_tsvector('german', COALESCE(unaccent(NEW.category), '')), 'B') ||
    setweight(to_tsvector('german', COALESCE(unaccent(NEW.vendor), '')), 'C') ||
    setweight(to_tsvector('german', COALESCE(unaccent(NEW.description), '')), 'D');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_search_vector
  BEFORE INSERT OR UPDATE OF title, description, category, vendor
  ON products
  FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Function: record price change in history when price changes
CREATE OR REPLACE FUNCTION record_price_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_history(product_id, price, vendor)
    VALUES (NEW.id, NEW.price, NEW.vendor);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_price_history
  AFTER UPDATE OF price ON products
  FOR EACH ROW EXECUTE FUNCTION record_price_history();
