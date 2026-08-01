// app/sitemap.js — dynamically built from real DB data
import { query } from "@/lib/db";

const BASE_URL = "https://www.preisgucken.de";

export const revalidate = 3600; // regenerate hourly so new vendors/categories/products appear without a deploy

export default async function sitemap() {
  const staticPages = [
    { url: BASE_URL,                                  lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/ueber-uns`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/so-funktioniert-es`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/kontakt`,                     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE_URL}/impressum`,                   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`,                 lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
  ];

  let categoryPages = [];
  try {
    const res = await query(
      `SELECT c.slug, MAX(p.updated_at) AS last_updated
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
       WHERE c.is_active = TRUE AND c.slug != 'sonstiges'
       GROUP BY c.slug, c.sort_order
       ORDER BY c.sort_order`
    );
    categoryPages = res.rows.map((r) => ({
      url:             `${BASE_URL}/kategorie/${r.slug}`,
      lastModified:    r.last_updated ? new Date(r.last_updated) : new Date(),
      changeFrequency: "daily",
      priority:        0.8,
    }));
  } catch (e) {
    console.error("sitemap: categories query failed", e.message);
  }

  // Sitemap protocol caps a single file at 50,000 URLs — 45,000 here
  // leaves headroom for static + category pages. If the catalog grows
  // past this, split into a sitemap index (multiple files).
  let productPages = [];
  try {
    const res = await query(
      `SELECT id, updated_at
       FROM products
       WHERE is_active = TRUE
         AND in_stock = TRUE
         AND image IS NOT NULL
         AND image != ''
         AND image NOT LIKE '%placeholder%'
       ORDER BY updated_at DESC
       LIMIT 45000`
    );
    productPages = res.rows.map((r) => ({
      url:             `${BASE_URL}/produkt/${r.id}`,
      lastModified:    r.updated_at ? new Date(r.updated_at) : new Date(),
      changeFrequency: "daily",
      priority:        0.7,
    }));
  } catch (e) {
    console.error("sitemap: products query failed", e.message);
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
