#!/usr/bin/env python3
"""
Daily price history snapshot.
Inserts today's price for all active products into price_history.
Also refreshes site_stats (price-filter slider bounds) — computed once
here rather than live on every homepage request, since prices only
really change once a night anyway. Run after AWIN sync so prices are
always fresh.
"""
import os
import psycopg2

DATABASE_URL = os.environ.get("RAILWAY_DATABASE_URL") or os.environ.get("DATABASE_URL")

def main():
    print("Connecting to database...")
    conn = psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=60,
        keepalives_interval=10,
        keepalives_count=5,
        connect_timeout=30,
    )
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO price_history (product_id, price, recorded_at)
        SELECT id, price, CURRENT_DATE
        FROM products
        WHERE is_active = TRUE AND in_stock = TRUE AND price > 0
        ON CONFLICT (product_id, recorded_at) DO UPDATE SET price = EXCLUDED.price
    """)
    count = cur.rowcount
    conn.commit()

    # Price-filter slider bounds — p95 (not raw MAX) drives the slider's
    # default drag range so one outlier listing can't stretch it so far
    # that every real-world price is crushed into a sliver of it; the
    # actual MAX still drives the number input's ceiling, so a deliberate
    # higher filter (e.g. "under €6000" for printers) is still typeable.
    cur.execute("""
        SELECT
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY price) AS p95,
            MAX(price) AS absolute_max
        FROM products WHERE is_active = TRUE AND in_stock = TRUE AND price > 0
    """)
    p95, absolute_max = cur.fetchone()
    cur.execute("""
        INSERT INTO site_stats (key, value, updated_at) VALUES
            ('price_slider_max', %s, NOW()),
            ('price_absolute_max', %s, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
    """, (p95, absolute_max))
    conn.commit()

    # Per-category price ceilings — a single sitewide p95 is a bad fit for
    # categories whose real prices sit well above it (E-Scooter: p95 ~€1200
    # vs. sitewide €500). "Effective" product set per category always
    # combines its own directly-assigned products with its children's
    # (not either/or — a category can have a real own-bucket AND much
    # larger child categories at once, e.g. Elektroinstallation: 637 own
    # vs. ~12,500 across its subcategories).
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
    category_rows = cur.fetchall()
    cur.execute("DELETE FROM category_price_stats")
    for category_id, cat_p95, cat_max in category_rows:
        cur.execute("""
            INSERT INTO category_price_stats (category_id, p95_price, max_price, updated_at)
            VALUES (%s, %s, %s, NOW())
        """, (category_id, cat_p95, cat_max))
    conn.commit()

    cur.close()
    conn.close()
    print(f"Done — {count} price snapshots recorded, site_stats refreshed (p95={p95}, max={absolute_max}), "
          f"category_price_stats refreshed for {len(category_rows)} categories")

if __name__ == "__main__":
    main()
