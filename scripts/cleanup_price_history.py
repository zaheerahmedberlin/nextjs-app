#!/usr/bin/env python3
"""
Weekly cleanup of price_history older than 30 days.
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

    cur.execute("DELETE FROM price_history WHERE recorded_at < CURRENT_DATE - INTERVAL '30 days'")
    deleted = cur.rowcount
    conn.commit()

    cur.close()
    conn.close()
    print(f"Done — {deleted} old price history rows deleted")

if __name__ == "__main__":
    main()
