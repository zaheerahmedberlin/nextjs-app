// scripts/snapshot-prices.js
// Run daily via Railway cron: node scripts/snapshot-prices.js
// Inserts one price_history row per active product (skips if already recorded today).
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      INSERT INTO price_history (product_id, price, recorded_at)
      SELECT id, price, CURRENT_DATE
      FROM products
      WHERE is_active = TRUE
      ON CONFLICT (product_id, recorded_at) DO NOTHING
    `);
    console.log(`[snapshot] ${res.rowCount} prices recorded for ${new Date().toISOString().split("T")[0]}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
