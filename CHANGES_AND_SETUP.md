# Preisgucken.de — Changes, Testing & Cron Setup

> Last updated: 2026-07-07

---

## Table of Contents

1. [Summary of All Changes](#1-summary-of-all-changes)
2. [Testing Steps](#2-testing-steps)
3. [Cron Jobs — Complete Setup Guide](#3-cron-jobs--complete-setup-guide)
   - [Option A: Local Machine](#option-a-local-machine)
   - [Option B: Railway (Production)](#option-b-railway-production)
   - [Option C: cron-job.org (Recommended)](#option-c-cron-joborg-recommended)
4. [Environment Variables Reference](#4-environment-variables-reference)
5. [Database Migrations Required](#5-database-migrations-required)

---

## 1. Summary of All Changes

### 1.1 Price History Chart

**File:** `components/PriceHistoryChart.jsx`

- Displays a line chart of the last 30 days of price history for a product
- Fetches from `/api/price-history?productId={id}`
- Shows a friendly "Noch keine Preishistorie" message when fewer than 2 data points exist
- Used in both the Product Modal and the Product Detail Page

**File:** `app/api/price-history/route.js`

- Returns price history rows for the last 30 days for a given `productId`
- Data comes from the `price_history` table (populated nightly by cron)

---

### 1.2 "Günstigster Preis" Badge

**File:** `components/ProductGrid.jsx`

- Green badge (top-left) shown when `product.price <= product.price_30d_min`
- Protects against false positives: only shows if the product has **≥ 7 days** of price history within the last 30 days, and today's snapshot is **excluded** from the min calculation

**File:** `app/api/products/route.js`

- Added `price_30d_min` subquery to the main products SELECT:

```sql
(SELECT MIN(ph.price) FROM price_history ph
 WHERE ph.product_id = p.id
   AND ph.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
   AND ph.recorded_at < CURRENT_DATE          -- excludes today
   AND (SELECT COUNT(*) FROM price_history ph2
        WHERE ph2.product_id = p.id
          AND ph2.recorded_at >= CURRENT_DATE - INTERVAL '30 days') >= 7
) AS price_30d_min
```

---

### 1.3 Product Detail Page

**File:** `app/produkt/[id]/page.jsx` *(new)*

- Server-rendered page at `/produkt/{id}`
- `generateMetadata()` for SEO title: `{Produkttitel} – {Preis} | Preisgucken`
- JSON-LD structured data: `Product` + `BreadcrumbList` schemas
- Breadcrumb: Startseite → Preisvergleich → {Produkttitel}
- Shows "↓ Günstigster Preis – 30-Tage-Tief" badge when applicable
- Includes `PriceHistoryChart` and `PriceAlarmFormClient` (client components)
- "Zum Angebot beim Händler →" CTA button
- Returns HTTP 404 via `notFound()` for unknown product IDs

**File:** `app/api/products/[id]/route.js` *(new)*

- `GET /api/products/{id}` — returns single product with all fields including `price_30d_min`

**File:** `components/PriceAlarmFormClient.jsx` *(new)*

- Standalone client component for the price alert form (extracted from ProductModal)
- Used on the Product Detail Page

**File:** `components/ProductGrid.jsx`

- Product title is now a `<Link href="/produkt/{id}">` (no stretched-link)
- Added "↗" button (dark blue) to navigate to the detail page

---

### 1.4 PWA / Mobile App

**File:** `public/manifest.json`

```json
{
  "name": "Preisgucken – Preisvergleich Deutschland",
  "short_name": "Preisgucken",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1A3A6B",
  "lang": "de",
  "orientation": "portrait-primary",
  "categories": ["shopping", "finance"],
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**File:** `app/layout.jsx`

Added PWA meta tags in `<head>`:

```html
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
<meta name="theme-color" content="#1A3A6B" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Preisgucken" />
<link rel="manifest" href="/manifest.json" />
```

**New icon files in `public/`:**

| File | Size | Purpose |
|------|------|---------|
| `icon-192.png` | 192×192 | Android home screen |
| `icon-512.png` | 512×512 | Android splash screen |
| `apple-touch-icon.png` | 180×180 | iOS home screen |

Generated from `favicon.png` (1024×1024) using macOS `sips`.

---

### 1.5 Removed "Aktivierungszeitraum" Filter

This was an internal admin concern, not useful for end users.

**File:** `components/Sidebar.jsx`

- Removed props: `activeFromFilter`, `setActiveFromFilter`, `activeUntilFilter`, `setActiveUntilFilter`
- Removed entire Aktivierungszeitraum section (date pickers + reset button)

**File:** `app/page.jsx`

- Removed state: `activeFromFilter`, `activeUntilFilter`
- Removed from `useEffect` dependency array
- Removed `activeFrom` and `activeUntil` params from API fetch call
- Removed props from `<Sidebar>`

**File:** `app/api/products/route.js`

- Removed `searchParams.get("activeFrom")` and `searchParams.get("activeUntil")`
- Removed SQL conditions for these params
- Removed from `cacheKey` and `searchProducts()` args

---

### 1.6 "Neu" Badge

**File:** `components/ProductGrid.jsx`

- Orange badge (top-right) shown for products added within 7 days **after launch date**
- Launch date cutoff: **2026-07-25**
- Logic: `created_at > "2026-07-25" AND (now - created_at) < 7 days`
- Prevents all bulk-imported products from showing "Neu" at launch

```jsx
{product.created_at &&
  new Date(product.created_at) > new Date("2026-07-25") &&
  (Date.now() - new Date(product.created_at).getTime()) < 7 * 86400000 && (
  <span className="badge position-absolute top-0 end-0 m-1"
    style={{ background: "#F07D00", color: "#fff", fontSize: "0.65rem", borderRadius: 4 }}>
    Neu
  </span>
)}
```

> **To update the launch date:** change `"2026-07-25"` in `components/ProductGrid.jsx` line 72.

---

## 2. Testing Steps

### 2.1 Price History Chart

1. Open the site at `http://localhost:3000`
2. Click any product card → "Preis prüfen" button
3. Modal opens → scroll down → chart should appear
4. To test with data: seed at least 7 rows in `price_history` for a product:
   ```sql
   INSERT INTO price_history (product_id, price, recorded_at)
   SELECT 17083, 289.99 - (generate_series * 2), CURRENT_DATE - generate_series
   FROM generate_series(1, 29);
   ```
5. Reload the page, open that product — chart shows a line with 29 points ✅
6. Products without history show "Noch keine Preishistorie" message ✅

---

### 2.2 "Günstigster Preis" Badge

1. Seed price history with today's price being the lowest (see step above)
2. The product card should show green "↓ Günstigster Preis" badge (top-left) ✅
3. To verify false-positive protection: check a product with only 1–2 days of history → badge should NOT appear ✅
4. API test in browser console:
   ```js
   fetch('/api/products?limit=5').then(r=>r.json()).then(d=>console.log(d.products.map(p=>p.price_30d_min)))
   ```
   → Should return `null` for products without enough history, a number for products with ≥7 days ✅

---

### 2.3 Product Detail Page

1. Click any product title or the "↗" button → navigates to `/produkt/{id}` ✅
2. Check browser tab title: `{Produkttitel} – €{Preis} | Preisgucken – Preisvergleich` ✅
3. Breadcrumb: Startseite / Preisvergleich / {Produkttitel} ✅
4. Price history chart renders (if data exists) ✅
5. Price alert form: enter email + target price → click "Preisalarm setzen" → green success message ✅
6. "Zum Angebot beim Händler →" button links to the vendor's product page ✅
7. Visit `/produkt/999999999` → should return 404 page ✅
8. Check SEO with curl:
   ```bash
   curl -s http://localhost:3000/produkt/17083 | grep -i '<title>'
   ```

---

### 2.4 PWA

1. Open Chrome DevTools → Application tab → Manifest ✅
2. Check: name, icons, display: standalone, theme_color all present ✅
3. On iPhone Safari: visit the site → Share → "Zum Home-Bildschirm" → icon appears ✅
4. On Android Chrome: address bar shows install banner or three-dot menu → "App installieren" ✅
5. Test offline: DevTools → Network → Offline → page still loads (Next.js shell cached) ✅

---

### 2.5 "Neu" Badge

1. Set a product's `created_at` to a date **after** 2026-07-25 to test:
   ```sql
   UPDATE products SET created_at = '2026-07-26 10:00:00' WHERE id = 17083;
   ```
2. Reload the product grid → the "Neu" badge (orange, top-right) should appear ✅
3. Products created before 2026-07-25 → no "Neu" badge ✅
4. Reset the test:
   ```sql
   UPDATE products SET created_at = NOW() - INTERVAL '60 days' WHERE id = 17083;
   ```

---

### 2.6 Removed Aktivierungszeitraum Filter

1. Open the site → sidebar should show only: Kategorien, Preisfilter, Verfügbarkeit ✅
2. No date picker inputs visible ✅
3. API still returns all products regardless of `active_from`/`active_until`:
   ```bash
   curl "http://localhost:3000/api/products?activeFrom=2099-01-01" | jq '.total'
   # Should return 8544 (same as without the param) ✅
   ```

---

## 3. Cron Jobs — Complete Setup Guide

There are **two cron jobs** that must run every day:

| Job | Endpoint | Schedule | What it does |
|-----|----------|----------|-------------|
| 1. Snapshot Prices | `GET /api/cron/snapshot-prices` | 02:00 UTC daily | Copies current price of all active products into `price_history` table |
| 2. Check Price Alerts | `GET /api/cron/check-price-alerts` | 03:00 UTC daily | Checks if any alert's target price is reached, sends email, deactivates alert |

Both endpoints are protected by a secret token in the `x-cron-token` header.

---

### Option A: Local Machine

Good for development and testing. Uses system crontab.

**Step 1: Set the secret**

Add to your `.env.local`:
```
CRON_SECRET=preisgucken2026secret
```

**Step 2: Open crontab**
```bash
crontab -e
```

**Step 3: Add the two jobs**
```cron
# Preisgucken – daily price snapshot at 02:00
0 2 * * * curl -s -H "x-cron-token: preisgucken2026secret" http://localhost:3000/api/cron/snapshot-prices >> /tmp/cron-snapshot.log 2>&1

# Preisgucken – daily price alert check at 03:00
0 3 * * * curl -s -H "x-cron-token: preisgucken2026secret" http://localhost:3000/api/cron/check-price-alerts >> /tmp/cron-alerts.log 2>&1
```

**Step 4: Verify**
```bash
# Test manually right now (skip the schedule):
curl -s -H "x-cron-token: preisgucken2026secret" http://localhost:3000/api/cron/snapshot-prices

# Expected response:
# {"ok":true,"recorded":8544,"date":"2026-07-07"}

# Check logs:
tail -f /tmp/cron-snapshot.log
tail -f /tmp/cron-alerts.log
```

**Step 5: Verify crontab is saved**
```bash
crontab -l
```

> **Note:** The Next.js dev server must be running (`npm run dev`) for local cron calls to work.

---

### Option B: Railway (Production)

Railway does not have a built-in cron scheduler. Use one of these approaches:

#### Option B1: Railway Cron Service (Recommended for Railway-only)

Railway supports cron via a separate service that runs a script on a schedule.

1. In Railway dashboard → **New Service** → **Empty Service**
2. Name it `cron-worker`
3. Add a `Dockerfile` or use a shell command as the start command:

```bash
# Start command in Railway service:
sh -c "while true; do
  HOUR=$(date -u +%H)
  MIN=$(date -u +%M)
  if [ $HOUR -eq 2 ] && [ $MIN -eq 0 ]; then
    curl -s -H 'x-cron-token: $CRON_SECRET' https://www.preisgucken.de/api/cron/snapshot-prices
  fi
  if [ $HOUR -eq 3 ] && [ $MIN -eq 0 ]; then
    curl -s -H 'x-cron-token: $CRON_SECRET' https://www.preisgucken.de/api/cron/check-price-alerts
  fi
  sleep 60
done"
```

4. Add env variable `CRON_SECRET=preisgucken2026secret` to this service

#### Option B2: Set CRON_SECRET on the main Next.js service

This is required regardless of which option you choose for scheduling.

1. Railway Dashboard → Your Next.js service → **Variables** tab
2. Add:
   ```
   CRON_SECRET=preisgucken2026secret
   ```
3. Click **Deploy** to apply

**Manual test after deploy:**
```bash
curl -s \
  -H "x-cron-token: preisgucken2026secret" \
  https://www.preisgucken.de/api/cron/snapshot-prices

# Expected:
# {"ok":true,"recorded":8544,"date":"2026-07-07"}
```

**Unauthorized test (should return 401):**
```bash
curl -s https://www.preisgucken.de/api/cron/snapshot-prices
# {"error":"Unauthorized"}
```

---

### Option C: cron-job.org (Recommended)

This is the **simplest and most reliable** approach. Free plan is sufficient.

**Step 1: Create account**

Go to [https://cron-job.org](https://cron-job.org) → Sign up (free)

---

**Step 2: Create Job 1 — Snapshot Prices**

1. Dashboard → **Create Cronjob**
2. Fill in:

| Field | Value |
|-------|-------|
| Title | `Preisgucken – Snapshot Prices` |
| URL | `https://www.preisgucken.de/api/cron/snapshot-prices` |
| Execution schedule | Custom: `0 2 * * *` (every day at 02:00 UTC) |
| Request method | `GET` |
| Request timeout | `30` seconds |
| Save responses | Yes (for debugging) |

3. Under **Headers** → Add header:
   - Name: `x-cron-token`
   - Value: `preisgucken2026secret`

4. Click **Create**

---

**Step 3: Create Job 2 — Check Price Alerts**

1. Dashboard → **Create Cronjob**
2. Fill in:

| Field | Value |
|-------|-------|
| Title | `Preisgucken – Check Price Alerts` |
| URL | `https://www.preisgucken.de/api/cron/check-price-alerts` |
| Execution schedule | Custom: `0 3 * * *` (every day at 03:00 UTC) |
| Request method | `GET` |
| Request timeout | `30` seconds |
| Save responses | Yes (for debugging) |

3. Under **Headers** → Add header:
   - Name: `x-cron-token`
   - Value: `preisgucken2026secret`

4. Click **Create**

---

**Step 4: Test immediately**

In cron-job.org dashboard → click the job → **"Execute now"** button

Expected response body (visible in the "Executions" tab):
```json
{"ok":true,"recorded":8544,"date":"2026-07-07"}
```

Expected HTTP status: `200`

---

**Step 5: Verify execution history**

After first automatic run (next day):

1. cron-job.org → Dashboard → click the job → **Execution history**
2. Check: status `200`, response time under 30s, response body `{"ok":true,...}`
3. Verify in database:
   ```sql
   SELECT recorded_at, COUNT(*) 
   FROM price_history 
   GROUP BY recorded_at 
   ORDER BY recorded_at DESC 
   LIMIT 7;
   ```
   → Should show one row per day with ~8000+ records each

---

## 4. Environment Variables Reference

All required env vars for production (Railway):

| Variable | Example Value | Required For |
|----------|--------------|-------------|
| `DATABASE_URL` | `postgresql://...` | Database connection |
| `REDIS_URL` | `redis://...` | Product cache |
| `CRON_SECRET` | `preisgucken2026secret` | Cron job authentication |
| `RESEND_API_KEY` | `re_...` | Sending price alert emails |
| `ELASTICSEARCH_URL` | `https://...` | Product search (optional) |
| `ELASTICSEARCH_API_KEY` | `...` | Elasticsearch auth (optional) |

For local development — `.env.local`:
```
DATABASE_URL=postgresql://localhost:5432/preisgucken
REDIS_URL=redis://localhost:6379
CRON_SECRET=preisgucken2026secret
RESEND_API_KEY=re_your_key_here
```

---

## 5. Database Migrations Required

Run these once on the Railway PostgreSQL database before going live.

### Migration 001 — Price History Table

File: `db/migrations/001_price_history.sql`

```bash
# Run via Railway CLI:
railway run psql $DATABASE_URL -f db/migrations/001_price_history.sql

# Or via psql directly (get DATABASE_URL from Railway dashboard):
psql "postgresql://..." -f db/migrations/001_price_history.sql
```

The migration creates:
- `price_history` table with `(product_id, price, recorded_at)` + unique constraint
- Index on `(product_id, recorded_at)` for fast chart queries

### Migration 002 — Price Alerts Table

File: `db/migrations/002_price_alerts.sql` (if not already run)

Creates:
- `price_alerts` table with `(email, product_id, target_price, is_active, triggered_at)`

### Verify migrations ran:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should include: categories, price_alerts, price_history, products, vendors, ...
```

---

## Quick Reference — Go-Live Checklist

- [ ] Run DB migrations on Railway PostgreSQL
- [ ] Set `CRON_SECRET=preisgucken2026secret` in Railway environment variables
- [ ] Set `RESEND_API_KEY` in Railway environment variables
- [ ] Create both cron jobs on cron-job.org with correct headers
- [ ] Test both cron endpoints manually (curl or cron-job.org "Execute now")
- [ ] Verify price history rows appear in DB after first cron run
- [ ] Update `LAUNCH_DATE` in `components/ProductGrid.jsx` if go-live date changes (currently `2026-07-25`)
- [ ] Add Google Search Console verification token in `app/layout.jsx`
- [ ] Deploy to Railway and confirm `https://www.preisgucken.de` is live
