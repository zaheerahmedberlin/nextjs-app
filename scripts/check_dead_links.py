#!/usr/bin/env python3
"""
Weekly dead-link checker.

Follows every active product's URL (through AWIN redirects where applicable)
and deactivates products whose page returns 404/410 on the merchant's site.
AWIN datafeeds can lag behind a merchant actually removing a product, so
this catches stale listings that the nightly feed sync alone won't.

Only a clear 404/410 counts as "dead" — timeouts, connection errors, and
5xx responses are left alone, since those are more likely transient than a
genuinely removed product, and we don't want to deactivate real inventory
because of a momentary blip on the merchant's side.

Usage:
    python scripts/check_dead_links.py [--dry-run] [--workers N]
"""
import argparse
import concurrent.futures
import os
import sys

import psycopg2
import requests

DATABASE_URL = os.environ.get("RAILWAY_DATABASE_URL") or os.environ.get("DATABASE_URL")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
}
DEAD_STATUSES = {404, 410}
TIMEOUT = 12


def connect():
    return psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=60,
        keepalives_interval=10,
        keepalives_count=5,
        connect_timeout=30,
    )


def check_url(product_id, url):
    """Returns (product_id, status) where status is an int HTTP code, or
    None if the request failed outright (timeout, DNS error, etc.)."""
    try:
        resp = requests.head(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        # Some sites don't support HEAD properly (405/501) — retry with GET.
        if resp.status_code in (405, 501):
            resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True, stream=True)
        return product_id, resp.status_code
    except requests.RequestException:
        return product_id, None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--workers", type=int, default=20)
    parser.add_argument("--limit", type=int, default=None, help="Only check N products (for testing)")
    args = parser.parse_args()

    conn = connect()
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT p.id, p.title, p.url, v.name
            FROM products p
            LEFT JOIN vendors v ON v.id = p.vendor_id
            WHERE p.is_active = TRUE AND p.url IS NOT NULL AND p.url != ''
            {"LIMIT %s" if args.limit else ""}
        """, (args.limit,) if args.limit else None)
        rows = cur.fetchall()
    print(f"Checking {len(rows)} active products...")

    id_lookup = {r[0]: (r[1], r[3]) for r in rows}
    dead_ids = []
    checked_ids = []
    unknown = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(check_url, pid, url) for pid, _, url, _ in rows]
        for i, future in enumerate(concurrent.futures.as_completed(futures), 1):
            pid, status = future.result()
            checked_ids.append(pid)
            if status in DEAD_STATUSES:
                title, vendor = id_lookup[pid]
                print(f"  DEAD [{status}] {vendor}: {title} (id={pid})")
                dead_ids.append(pid)
            elif status is None:
                unknown += 1
            if i % 1000 == 0:
                print(f"  ...{i}/{len(rows)} checked")

    print(f"\nDone — {len(dead_ids)} dead, {unknown} unreachable/timed out (left as-is), {len(rows)} total checked")

    if args.dry_run:
        print("DRY RUN — no DB changes made")
        return

    with conn.cursor() as cur:
        if checked_ids:
            cur.execute("UPDATE products SET link_checked_at = now() WHERE id = ANY(%s)", (checked_ids,))
        if dead_ids:
            cur.execute("UPDATE products SET is_active = FALSE WHERE id = ANY(%s)", (dead_ids,))
    conn.commit()
    conn.close()
    print(f"Deactivated {len(dead_ids)} dead listing(s)")


if __name__ == "__main__":
    main()
