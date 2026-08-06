#!/usr/bin/env python3
"""
Daily refresh for AWIN-accepted vendors with no product feed — fetches each
vendor's public Shopify /products.json and upserts by Shopify product id.

Companion to import_awin_feeds.py, which only handles AWIN CSV feeds; these
vendors (Tsarbomba, Sparkle GmbH) don't have one. Ported from the one-off
onboarding scripts in the scraper repo (import_tsarbomba.py, import_sparkle.py)
— keep in sync there if category taxonomy or exclusions change.
"""
import html
import json
import os
import time
import urllib.request
import urllib.parse
import psycopg2

DATABASE_URL = os.environ.get("RAILWAY_DATABASE_URL") or os.environ.get("DATABASE_URL")
AWIN_AFFID = 2988023


def connect():
    return psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=60,
        keepalives_interval=10,
        keepalives_count=5,
        connect_timeout=30,
    )


def fetch_all_products(base_url):
    products = []
    page = 1
    while True:
        url = f"{base_url}/products.json?limit=250&page={page}"
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.load(resp)
        except Exception as e:
            print(f"    Error fetching page {page}: {e}")
            break
        batch = data.get("products", [])
        if not batch:
            break
        products.extend(batch)
        if len(batch) < 250:
            break
        page += 1
        time.sleep(0.5)
    return products


def affiliate_url(awin_mid, product_url):
    encoded = urllib.parse.quote(product_url, safe="")
    return f"https://www.awin1.com/cread.php?awinmid={awin_mid}&awinaffid={AWIN_AFFID}&ued={encoded}"


# ── Tsarbomba — single category, no product_type taxonomy ──────────────────
def tsarbomba_category(_product):
    return 79  # Uhren

def tsarbomba_skip(product):
    return "payment link" in product.get("title", "").lower()


# ── Sparkle GmbH — Schmuck subtree keyed by product_type ────────────────────
SPARKLE_TYPE_TO_CATEGORY = {
    "earrings": 81, "necklaces": 82, "bracelets": 83,
    "rings": 84, "anklets": 85, "jewelry sets": 86,
}
SPARKLE_EXCLUDED_TYPES = {
    "gift ideas", "jewelry cleaning & care", "shopping totes",
    "jewelry packaging", "gift cards",
}

def sparkle_category(product):
    pt = (product.get("product_type") or "").strip().lower()
    return SPARKLE_TYPE_TO_CATEGORY.get(pt, 80)  # 80 = Schmuck (fallback)

def sparkle_skip(product):
    pt = (product.get("product_type") or "").strip().lower()
    return pt in SPARKLE_EXCLUDED_TYPES


VENDORS = [
    {
        "name": "Tsarbomba",
        "base_url": "https://tsarbomba.com",
        "awin_mid": 109230,
        "category_fn": tsarbomba_category,
        "skip_fn": tsarbomba_skip,
    },
    {
        "name": "Sparkle GmbH",
        "base_url": "https://www.heyhappiness.com",
        "awin_mid": 111366,
        "category_fn": sparkle_category,
        "skip_fn": sparkle_skip,
    },
]


def get_vendor_id(cur, vendor_name):
    cur.execute("SELECT id FROM vendors WHERE name = %s", (vendor_name,))
    row = cur.fetchone()
    return row[0] if row else None


def upsert_product(cur, product, vendor_id, base_url, awin_mid, category_fn, skip_fn):
    # Shopify's JSON API returns title/body_html with HTML entities intact
    # (e.g. "&" -> "&amp;") — unescape so stored text matches what a
    # shopper actually reads, not the raw markup encoding.
    title = html.unescape(product.get("title", "").strip())
    handle = product.get("handle", "")
    if not title or not handle:
        return "skipped"
    if skip_fn(product):
        return "skipped"

    category_id = category_fn(product)
    description = html.unescape((product.get("body_html") or "").strip())
    product_url = f"{base_url}/products/{handle}"
    url = affiliate_url(awin_mid, product_url)

    images = product.get("images", [])
    image = images[0].get("src", "") if images else ""

    variants = product.get("variants", [])
    if not variants:
        return "skipped"
    v = variants[0]
    try:
        price = float(v.get("price") or 0)
    except (ValueError, TypeError):
        return "skipped"
    if price <= 0:
        return "skipped"

    old_price = None
    try:
        if v.get("compare_at_price"):
            old_price = float(v["compare_at_price"])
            if old_price <= price:
                old_price = None
    except (ValueError, TypeError):
        pass

    in_stock = bool(v.get("available", True))
    external_id = str(product.get("id", ""))
    currency = "EUR"

    cur.execute("""
        INSERT INTO products
          (title, description, image, url, price, old_price, currency,
           vendor_id, category_id, external_id, in_stock, is_active,
           search_vector)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,true,
          to_tsvector('german', unaccent(coalesce(%s,'') || ' ' || coalesce(%s,''))))
        ON CONFLICT (external_id, vendor_id) DO UPDATE SET
          title=EXCLUDED.title,
          description=EXCLUDED.description,
          image=EXCLUDED.image,
          price=EXCLUDED.price,
          old_price=EXCLUDED.old_price,
          currency=EXCLUDED.currency,
          url=EXCLUDED.url,
          in_stock=EXCLUDED.in_stock,
          category_id=EXCLUDED.category_id,
          updated_at=now(),
          search_vector=EXCLUDED.search_vector
        RETURNING (xmax = 0) AS inserted
    """, (title, description, image, url, price, old_price, currency,
          vendor_id, category_id, external_id, in_stock,
          title, description))

    row = cur.fetchone()
    return "inserted" if row and row[0] else "updated"


def refresh_vendor(vendor_conf):
    name = vendor_conf["name"]
    print(f"\nProcessing {name}...")
    conn = connect()
    conn.autocommit = False
    try:
        with conn.cursor() as cur:
            vendor_id = get_vendor_id(cur, name)
            if not vendor_id:
                print(f"  ERROR: vendor '{name}' not found in DB, skipping")
                return 0

            print(f"  Fetching {name} products...")
            products = fetch_all_products(vendor_conf["base_url"])
            print(f"  {len(products)} products fetched")

            ins = upd = skp = 0
            for product in products:
                result = upsert_product(
                    cur, product, vendor_id, vendor_conf["base_url"],
                    vendor_conf["awin_mid"], vendor_conf["category_fn"], vendor_conf["skip_fn"],
                )
                if result == "inserted":
                    ins += 1
                elif result == "updated":
                    upd += 1
                else:
                    skp += 1

            conn.commit()
            print(f"  {name}: {ins} inserted, {upd} updated, {skp} skipped")
            return ins + upd
    except Exception as e:
        print(f"  ERROR processing {name}: {e}")
        conn.rollback()
        return 0
    finally:
        conn.close()


def main():
    total = 0
    for vendor_conf in VENDORS:
        total += refresh_vendor(vendor_conf)
    print(f"\nDone — {total} products imported/updated across Shopify-API vendors")


if __name__ == "__main__":
    main()
