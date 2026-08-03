// lib/sitemap.js — shared constants/helpers for app/sitemap.js and
// app/robots.js so the two stay in sync on how many sitemap files exist.
import { query } from "@/lib/db";

// Kept comfortably under Google's 50,000/file cap so a single large
// vendor import doesn't push a chunk over the limit.
export const PRODUCTS_PER_SITEMAP = 20000;

export const PRODUCT_SITEMAP_FILTER = `
  is_active = TRUE
  AND in_stock = TRUE
  AND image IS NOT NULL
  AND image != ''
  AND image NOT LIKE '%placeholder%'
`;

export async function getProductSitemapChunkCount() {
  const countRes = await query(`SELECT COUNT(*) FROM products WHERE ${PRODUCT_SITEMAP_FILTER}`);
  const totalProducts = parseInt(countRes.rows[0].count);
  return Math.ceil(totalProducts / PRODUCTS_PER_SITEMAP);
}
