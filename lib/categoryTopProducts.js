// lib/categoryTopProducts.js
// The 24 products shown first on a category page (server-rendered, so it is
// also what Google reads). Plain "cheapest first" put 0,02 € washers and
// 0,08 € cable plugs at the top of the biggest categories, so the default is
// still cheapest-first but with a sanity floor, a real image and at most
// MAX_PER_VENDOR items per vendor.
//
// The candidate pool is taken from the price order and the vendor cap is applied
// on that small pool, instead of ranking every product of the category, so the
// cost stays small even for categories with tens of thousands of products
// (measured on a 600k-row scratch table: tens to ~250 ms, with or without a
// category_id index).
import { query } from "@/lib/db";

const PRICE_FLOOR = 1; // EUR — below this are mostly screws, plugs, single-use items
const MAX_PER_VENDOR = 4;
const LIMIT = 24;
const MIN_ROWS = 12; // below this the filtered view is too thin → widen / fall back

async function candidates(catIds, pool) {
  const res = await query(
    `SELECT p.id, p.title, p.price, p.old_price, p.image, p.url, p.in_stock, p.vendor_id,
            v.name AS vendor, v.logo_url AS vendor_logo
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE p.category_id = ANY($1)
       AND p.is_active = TRUE AND p.in_stock = TRUE
       AND p.price >= $2
       AND p.image IS NOT NULL AND p.image <> ''
     ORDER BY p.price ASC, p.id
     LIMIT $3`,
    [catIds, PRICE_FLOOR, pool]
  );
  return res.rows;
}

// Per-vendor cap applied in JS on the small, price-ordered pool.
function capPerVendor(rows) {
  const seen = new Map();
  const out = [];
  for (const r of rows) {
    const n = seen.get(r.vendor_id) ?? 0;
    if (n >= MAX_PER_VENDOR) continue;
    seen.set(r.vendor_id, n + 1);
    out.push(r);
    if (out.length === LIMIT) break;
  }
  return out;
}

export async function getCategoryTopProducts(catIds) {
  // 1) normal pool; 2) wider pool, only when the first pool was full (i.e. one
  // vendor filled the cheap end and more candidates exist beyond it)
  for (const pool of [400, 4000]) {
    const cand = await candidates(catIds, pool);
    const rows = capPerVendor(cand);
    if (rows.length >= MIN_ROWS) return rows;
    if (cand.length < pool) break; // pool exhausted → widening cannot help
  }
  // 3) tiny category, or all items under the floor / without image:
  // original behaviour
  const res = await query(
    `SELECT p.id, p.title, p.price, p.old_price, p.image, p.url, p.in_stock,
            v.name AS vendor, v.logo_url AS vendor_logo
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE p.category_id = ANY($1)
       AND p.is_active = TRUE AND p.in_stock = TRUE
     ORDER BY p.price ASC
     LIMIT ${LIMIT}`,
    [catIds]
  );
  return res.rows;
}
