import csv
import gzip
import psycopg2
import io

FEED_PATH = "/tmp/deubaxl_feed.csv.gz"
DB_NAME = "preisgucken"

CATEGORY_MAP = {
    "kind": 9,
    "baby": 9,
    "spielzeug": 9,
    "pool": 8,
    "schwimmbad": 8,
    "garten": 36,
    "terrasse": 8,
    "balkon": 8,
    "outdoor": 8,
    "sonnenschirm": 38,
    "rasenmäher": 39,
    "hochbeet": 40,
    "sofa": 16,
    "couch": 16,
    "sessel": 17,
    "stuhl": 19,
    "stühle": 19,
    "bett": 10,
    "matratze": 15,
    "schrank": 20,
    "kommode": 21,
    "regal": 22,
    "sideboard": 23,
    "tisch": 24,
    "schreibtisch": 26,
    "couchtisch": 25,
    "leuchte": 5,
    "lampe": 5,
    "licht": 5,
    "küche": 6,
    "bad": 7,
    "dusche": 7,
    "werkzeug": 9,
    "heimwerker": 9,
    "sport": 8,
    "freizeit": 8,
    "tier": 9,
    "hund": 9,
    "haushalt": 9,
}

def guess_category(merchant_category, product_name):
    text = (merchant_category + " " + product_name).lower()
    for keyword, cat_id in CATEGORY_MAP.items():
        if keyword in text:
            return cat_id
    return 9  # Sonstiges

def main():
    conn = psycopg2.connect(dbname=DB_NAME)
    cur = conn.cursor()

    # Get or create DeubaXXL vendor
    cur.execute("SELECT id FROM vendors WHERE name ILIKE '%deuba%' LIMIT 1")
    row = cur.fetchone()
    if row:
        vendor_id = row[0]
    else:
        cur.execute(
            "INSERT INTO vendors (name, logo_url, website_url) VALUES (%s, %s, %s) RETURNING id",
            ("DeubaXXL", "https://www.deubaxxl.de/favicon.ico", "https://www.deubaxxl.de")
        )
        vendor_id = cur.fetchone()[0]
    print(f"Vendor ID: {vendor_id}")

    inserted = 0
    skipped = 0

    with gzip.open(FEED_PATH, "rt", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            title = row.get("product_name", "").strip()
            price_str = row.get("search_price", "0").strip()
            image = row.get("aw_image_url") or row.get("merchant_image_url", "")
            url = row.get("aw_deep_link", "").strip()
            description = row.get("description", "").strip()[:1000]
            merchant_category = row.get("merchant_category", "")

            if not title or not url:
                skipped += 1
                continue

            try:
                price = float(price_str)
            except ValueError:
                price = 0.0

            category_id = guess_category(merchant_category, title)

            cur.execute("SELECT id FROM products WHERE url = %s AND vendor_id = %s", (url, vendor_id))
            existing = cur.fetchone()
            if existing:
                cur.execute("""
                    UPDATE products SET price = %s, title = %s, image = %s, category_id = %s WHERE id = %s
                """, (price, title, image, category_id, existing[0]))
            else:
                cur.execute("""
                    INSERT INTO products (title, description, image, price, url, vendor_id, category_id, in_stock)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, true)
                """, (title, description, image, price, url, vendor_id, category_id))
            inserted += 1

    conn.commit()
    cur.close()
    conn.close()
    print(f"Done — {inserted} products imported, {skipped} skipped")

if __name__ == "__main__":
    main()
