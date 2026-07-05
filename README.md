# Preisgucken – Price Comparison Platform

German price comparison site for furniture & electronics. Built with Next.js, PostgreSQL, Redis, and Elasticsearch.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Database | PostgreSQL (via Postgres.app) |
| Cache | Redis |
| Search | Elasticsearch 7.17.4 |
| Auth | JWT (httpOnly cookies) |
| File Uploads | CSV / XLSX → PostgreSQL bytea |

---

## Prerequisites

Make sure the following are installed:

- [Node.js](https://nodejs.org) v18+
- [Postgres.app](https://postgresapp.com) — PostgreSQL for Mac
- Redis — `brew install redis`
- Elasticsearch — `brew install elastic/tap/elasticsearch-full`

---

## Environment Setup

Create a `.env.local` file in the project root:

```env
# PostgreSQL
PGHOST=localhost
PGPORT=5432
PGDATABASE=preisgucken
PGUSER=
PGPASSWORD=

# Redis
REDIS_URL=redis://localhost:6379

# Elasticsearch
ELASTICSEARCH_URL=http://localhost:9200

# Auth
JWT_SECRET=change-this-to-a-long-random-string-in-production
```

---

## Starting Services

### Redis

```bash
# Start
/usr/local/opt/redis/bin/redis-server /usr/local/etc/redis.conf --daemonize yes

# Stop
/usr/local/opt/redis/bin/redis-cli shutdown

# Check if running
redis-cli ping   # should return PONG
```

### Elasticsearch (with reduced memory for local dev)

```bash
# Start (256MB heap — low memory mode)
ES_JAVA_OPTS="-Xms256m -Xmx256m" /usr/local/opt/elasticsearch-full/bin/elasticsearch -d -p /tmp/elasticsearch.pid

# Stop
kill $(cat /tmp/elasticsearch.pid)

# Check if running
curl http://localhost:9200   # should return cluster info
```

### Start both with one command

```bash
# From preis_gucken_frontend/ directory
./start-services.sh

# Stop both
./stop-services.sh
```

> Neither Redis nor Elasticsearch auto-starts on system boot — run the script manually when needed.

---

## Database Setup

Make sure Postgres.app is running, then:

```bash
# Add psql to PATH (one-time setup)
echo 'export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Run migrations
psql -d preisgucken -f db/migrations/001_create_tables.sql
psql -d preisgucken -f db/migrations/002_active_schedule.sql
psql -d preisgucken -f db/migrations/003_vendor_uploads.sql
```

---

## Starting the App

```bash
# Install dependencies
npm install

# Development
npm run dev        # starts at http://localhost:3000

# Production build
npm run build
npm start
```

---

## Admin Panel

URL: `http://localhost:3000/admin/login`

| Credential | Value |
|---|---|
| Email | admin@preisgucken.de |
| Password | *(set in DB — see below)* |

### Reset admin password

```bash
node -e "const b = require('bcryptjs'); b.hash('yourPassword', 10).then(h => console.log(h))"
# Copy the hash, then:
psql -d preisgucken -c "UPDATE admins SET password_hash = '<hash>' WHERE email = 'admin@preisgucken.de';"
```

### Admin pages

| Page | URL |
|---|---|
| Billing | `/admin/billing` |
| Vendor management | `/admin/vendors` |
| Upload approvals | `/admin/uploads` |

---

## Vendor Portal

URL: `http://localhost:3000/vendor/login`

Vendor credentials are set by admin via **Vendors → Aktion wählen → Portal-Zugang**.

### Vendor portal pages

| Page | URL |
|---|---|
| Login | `/vendor/login` |
| Dashboard | `/vendor/dashboard` |
| Upload products | `/vendor/upload` |

### Upload flow

1. Vendor uploads CSV or XLSX (max 50 MB)
2. Column mapping UI — auto-matched, saved per vendor for future uploads
3. Admin approves at `/admin/uploads`
4. Background worker processes file → inserts products into DB
5. File bytes deleted after processing, metadata kept forever

### Sample test files

| File | Description |
|---|---|
| `/vendor/template.csv` | Empty template with correct column headers |
| `/vendor/sample_products.csv` | 10 basic products |
| `/vendor/test_products_advanced.csv` | 12 products with edge cases (umlauts, HTML, varied price formats) |

---

## Project Structure

```
nextjs-app/
├── app/
│   ├── admin/              ← Admin panel pages
│   │   ├── billing/
│   │   ├── vendors/
│   │   └── uploads/
│   ├── vendor/             ← Vendor portal pages
│   │   ├── login/
│   │   ├── dashboard/
│   │   └── upload/
│   ├── api/
│   │   ├── admin/          ← Admin API routes
│   │   ├── vendor/         ← Vendor API routes
│   │   ├── products/
│   │   ├── search/
│   │   └── categories/
│   └── page.jsx            ← Main homepage
├── components/             ← Shared UI components
├── lib/
│   ├── db.js               ← PostgreSQL pool
│   ├── auth.js             ← JWT auth (admin + vendor)
│   ├── redis.js            ← Redis cache helpers
│   ├── elasticsearch.js    ← Search client
│   ├── vendorFileParser.js ← CSV/XLSX parser + column mapper
│   └── vendorWorker.js     ← Background upload processor
├── db/
│   ├── migrations/         ← SQL migration files
│   └── seeds/              ← Seed data
└── public/
    └── vendor/             ← Downloadable vendor templates
```

---

## Key Database Tables

| Table | Purpose |
|---|---|
| `products` | All product listings |
| `vendors` | Shops / vendors |
| `vendor_uploads` | Upload history + file bytes (temporary) |
| `categories` | 2-level category tree |
| `price_history` | Price change tracking |
| `offers` | Time-limited deals |
| `admins` | Admin accounts |
