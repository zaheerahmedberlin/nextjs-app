#!/usr/bin/env node
// scripts/import-products.js
// ─────────────────────────────────────────────────────────────
// One-time script to import your existing products.json
// into PostgreSQL and index into ElasticSearch.
//
// Run: node scripts/import-products.js
// ─────────────────────────────────────────────────────────────
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  host:     process.env.PGHOST     || "localhost",
  port:     parseInt(process.env.PGPORT || "5432"),
  database: process.env.PGDATABASE || "preisgucken",
  user:     process.env.PGUSER     || "postgres",
  password: process.env.PGPASSWORD || "",
});

async function importProducts() {
  const filePath = path.join(__dirname, "../public/products.json");
  if (!fs.existsSync(filePath)) {
    console.error("products.json not found at", filePath);
    process.exit(1);
  }

  const products = JSON.parse(fs.readFileSync(filePath, "utf8"));
  console.log(`Importing ${products.length} products...`);

  let inserted = 0;
  let updated = 0;
  let errors = 0;

  for (const p of products) {
    try {
      // Upsert — insert or update if external_id already exists
      await pool.query(`
        INSERT INTO products
          (external_id, title, description, image, url, ean, category, vendor, price, old_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (external_id) DO UPDATE SET
          title       = EXCLUDED.title,
          description = EXCLUDED.description,
          image       = EXCLUDED.image,
          price       = EXCLUDED.price,
          old_price   = EXCLUDED.old_price,
          updated_at  = NOW()
      `, [
        String(p.id),
        p.title,
        p.description || null,
        p.image || null,
        p.url || null,
        p.ean || null,
        p.category || null,
        p.vendor || null,
        p.price || 0,
        p.oldPrice || null,
      ]);

      inserted++;
      if (inserted % 500 === 0) console.log(`  ${inserted}/${products.length} done...`);
    } catch (err) {
      errors++;
      if (errors < 5) console.error("Error on product", p.id, err.message);
    }
  }

  console.log(`\nDone! Inserted/updated: ${inserted}, Errors: ${errors}`);
  await pool.end();
}

importProducts().catch((err) => {
  console.error(err);
  process.exit(1);
});
