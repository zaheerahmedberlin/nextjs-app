// lib/db.js
// ─────────────────────────────────────────────────────────────
// PostgreSQL connection pool using the `pg` library.
// A single pool is reused across all API route calls —
// Next.js hot-reloads modules in dev, so we cache it on
// the global object to avoid "too many connections" errors.
// ─────────────────────────────────────────────────────────────
import { Pool } from "pg";

// In production these come from environment variables (Vercel, Railway, etc.)
// In development, create a .env.local file with these values.
const isProduction = process.env.NODE_ENV === "production";

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    }
  : {
      host:     process.env.PGHOST     || "localhost",
      port:     parseInt(process.env.PGPORT || "5432"),
      database: process.env.PGDATABASE || "preisgucken",
      user:     process.env.PGUSER     || "postgres",
      password: process.env.PGPASSWORD || "",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
    };

// Cache pool on global to survive Next.js hot reloads in dev
let pool;
if (process.env.NODE_ENV === "production") {
  pool = new Pool(poolConfig);
} else {
  if (!global._pgPool) global._pgPool = new Pool(poolConfig);
  pool = global._pgPool;
}

export { pool as db };

// ── Helper: run a query with automatic error logging ──────────
export async function query(text, params = []) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== "production") {
      console.log("query", { text: text.slice(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error("DB query error:", { text, params, error: err.message });
    throw err;
  }
}

// ── Helper: paginate any query ─────────────────────────────────
export function paginate(page = 1, limit = 24) {
  const safePage  = Math.max(1, parseInt(page));
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit)));
  return {
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
}
