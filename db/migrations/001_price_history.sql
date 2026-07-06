-- Price history: one row per product per day
CREATE TABLE IF NOT EXISTS price_history (
  id           BIGSERIAL PRIMARY KEY,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price        NUMERIC(10,2) NOT NULL,
  in_stock     BOOLEAN NOT NULL DEFAULT true,
  recorded_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (product_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_price_history_product_date
  ON price_history (product_id, recorded_at DESC);

-- Backfill today's snapshot from current products table
INSERT INTO price_history (product_id, price, in_stock, recorded_at)
SELECT id, price, in_stock, CURRENT_DATE
FROM products
WHERE is_active = TRUE
ON CONFLICT (product_id, recorded_at) DO NOTHING;
