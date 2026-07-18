#!/usr/bin/env python3
"""
Daily AWIN product feed importer.
Loops all vendors with a feed_url and upserts products into the DB.
"""
import csv
import gzip
import io
import os
import urllib.request
import psycopg2

DATABASE_URL = os.environ.get("RAILWAY_DATABASE_URL") or os.environ.get("DATABASE_URL")

CATEGORY_KEYWORDS = {
    36: ["garten", "terrasse", "balkon", "sonnenschirm", "pflanzk", "gartenmöbel"],
    8:  ["pool", "outdoor", "sport", "fahrrad", "camping", "freizeit"],
    5:  ["leuchte", "lampe", "licht", "led"],
    6:  ["küche", "kochen", "grill", "backen"],
    4:  ["tisch", "esstisch", "couchtisch", "schreibtisch"],
    2:  ["sofa", "couch", "sessel", "stuhl", "sitzen"],
    1:  ["bett", "matratze", "schlafen", "kissen", "decke"],
    3:  ["schrank", "regal", "kommode", "sideboard", "aufbewahrung"],
    7:  ["bad", "dusche", "sanitär", "waschbecken"],
    41: ["vitamin", "nahrungsergänzung", "supplement", "gesundheit", "booster"],
    27: ["elektronik", "computer", "laptop", "smartphone", "tablet"],
}

def guess_category(merchant_category, title):
    text = (merchant_category + " " + title).lower()
    for cat_id, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return cat_id
    return 9  # Sonstiges

def import_vendor(cur, vendor_id, vendor_name, feed_url):
    print(f"  Downloading feed for {vendor_name}...")
    try:
        req = urllib.request.Request(feed_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
    except Exception as e:
        print(f"  ERROR downloading feed: {e}")
        return 0

    inserted = updated = skipped = 0

    try:
        f = gzip.decompress(raw)
        reader = csv.DictReader(io.StringIO(f.decode("utf-8")))
    except Exception:
        reader = csv.DictReader(io.StringIO(raw.decode("utf-8")))

    for row in reader:
        title = row.get("product_name", "").strip()
        url   = row.get("aw_deep_link", "").strip()
        if not title or not url:
            skipped += 1
            continue

        try:
            price = float(row.get("search_price", "0") or 0)
        except ValueError:
            price = 0.0

        image    = row.get("aw_image_url") or row.get("merchant_image_url", "")
        desc     = (row.get("description", "") or "")[:1000]
        merchant_category = row.get("merchant_category", "")
        category_id = guess_category(merchant_category, title)
        search_vector_expr = "to_tsvector('german', unaccent(coalesce(%s, '') || ' ' || coalesce(%s, '')))"

        cur.execute("SELECT id FROM products WHERE url = %s AND vendor_id = %s", (url, vendor_id))
        existing = cur.fetchone()
        if existing:
            cur.execute("""
                UPDATE products SET price=%s, title=%s, image=%s, category_id=%s,
                search_vector=to_tsvector('german', unaccent(coalesce(%s,'')||' '||coalesce(%s,'')))
                WHERE id=%s
            """, (price, title, image, category_id, title, desc, existing[0]))
            updated += 1
        else:
            cur.execute("""
                INSERT INTO products (title, description, image, price, url, vendor_id, category_id, in_stock, is_active, search_vector)
                VALUES (%s, %s, %s, %s, %s, %s, %s, true, true,
                to_tsvector('german', unaccent(coalesce(%s,'')||' '||coalesce(%s,''))))
            """, (title, desc, image, price, url, vendor_id, category_id, title, desc))
            inserted += 1

    print(f"  {vendor_name}: {inserted} inserted, {updated} updated, {skipped} skipped")
    return inserted + updated

def main():
    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    cur.execute("SELECT id, name, feed_url FROM vendors WHERE feed_url IS NOT NULL AND feed_url != ''")
    vendors = cur.fetchall()
    print(f"Found {len(vendors)} vendor(s) with feed URLs")

    total = 0
    for vendor_id, vendor_name, feed_url in vendors:
        print(f"\nProcessing {vendor_name} (id={vendor_id})...")
        count = import_vendor(cur, vendor_id, vendor_name, feed_url)
        total += count
        conn.commit()

    cur.close()
    conn.close()
    print(f"\nDone — {total} products imported/updated across {len(vendors)} vendors")

if __name__ == "__main__":
    main()
