// lib/sitemap.js — shared constants/helpers for app/sitemap.js and
// app/robots.js so the two stay in sync on how many sitemap files exist.

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
  // Returns 0 as of 2026-09-20 -- product pages are now noindex (see
  // app/produkt/[id]/page.jsx), so submitting them via sitemap would be
  // self-contradictory (Google explicitly flags noindex'd URLs present in
  // a sitemap as a quality-confusion signal). This single change removes
  // every /produkt/ chunk from both app/sitemap.js's generateSitemaps()
  // and app/robots.js's sitemap list automatically, since both derive
  // their count from this function -- category + static pages (id 0) are
  // untouched. Old cached /sitemap/N.xml URLs (N>0) now correctly 404
  // instead of serving content, which is the standard, expected way to
  // signal a removed sitemap file to crawlers.
  return 0;
}
