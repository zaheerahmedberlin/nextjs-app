#!/usr/bin/env python3
"""
Daily price history snapshot.
Inserts today's price for all active products into price_history.
Run after AWIN sync so prices are always fresh.
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

    cur.close()
    conn.close()
    print(f"Done — {count} price snapshots recorded for {os.environ.get('RAILWAY_DATABASE_URL', 'local')[:30]}...")

if __name__ == "__main__":
    main()
