#!/usr/bin/env python3
"""
Creates (if missing) and backfills category_price_stats — per-category
price ceilings (95th percentile + absolute max) so the price-filter
slider can be scoped to whatever category is being browsed instead of
one sitewide value. Computed here, in the same nightly cron as the
sitewide site_stats values, never queried live from the app.

The "effective" product set per category always combines its own
directly-assigned products with its children's, matching the always-sum
rollup used everywhere else (app/api/products/route.js,
lib/categoryTree.js) — not an either/or choice, since a category can
have a real own-bucket AND much larger child categories at once
(Elektroinstallation: 637 own vs. ~12,500 across its subcategories).
"""
import os
import psycopg2

DATABASE_URL = os.environ.get("RAILWAY_DATABASE_URL") or os.environ.get("DATABASE_URL")

def main():
    conn = psycopg2.connect(DATABASE_URL) if DATABASE_URL else psycopg2.connect()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS category_price_stats (
            category_id INT PRIMARY KEY REFERENCES categories(id) ON DELETE CASCADE,
            p95_price NUMERIC,
            max_price NUMERIC,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    conn.commit()

    cur.execute("""
        WITH cat_effective AS (
            SELECT c.id AS category_id, c.id AS effective_id
            FROM categories c
            UNION ALL
            SELECT c.id AS category_id, ch.id AS effective_id
            FROM categories c
            JOIN categories ch ON ch.parent_id = c.id
        )
        SELECT
            ce.category_id,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY p.price) AS p95_price,
            MAX(p.price) AS max_price
        FROM cat_effective ce
        JOIN products p
            ON p.category_id = ce.effective_id
            AND p.is_active = TRUE AND p.in_stock = TRUE AND p.price > 0
        GROUP BY ce.category_id
    """)
    rows = cur.fetchall()

    cur.execute("DELETE FROM category_price_stats")
    for category_id, p95_price, max_price in rows:
        cur.execute("""
            INSERT INTO category_price_stats (category_id, p95_price, max_price, updated_at)
            VALUES (%s, %s, %s, NOW())
        """, (category_id, p95_price, max_price))
    conn.commit()

    cur.close()
    conn.close()
    print(f"Done — category_price_stats backfilled for {len(rows)} categories")

if __name__ == "__main__":
    main()
