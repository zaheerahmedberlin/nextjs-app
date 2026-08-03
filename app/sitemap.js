// app/sitemap.js — dynamically built from real DB data, split across
// multiple sitemap files via generateSitemaps() so the catalog can grow
// past a single file's 50,000-URL cap (Google's hard limit per sitemap).
// Next.js does NOT auto-generate a /sitemap.xml index for split sitemaps —
// each file is served individually at /sitemap/0.xml, /sitemap/1.xml, etc.
// robots.js lists every file explicitly so crawlers can discover them all.
import { query } from "@/lib/db";
import { PRODUCTS_PER_SITEMAP, PRODUCT_SITEMAP_FILTER, getProductSitemapChunkCount } from "@/lib/sitemap";

const BASE_URL = "https://www.preisgucken.de";

export const revalidate = 3600; // regenerate hourly so new vendors/categories/products appear without a deploy

// id 0 = static pages + categories. id 1..N = product chunks.
export async function generateSitemaps() {
  const productSitemapCount = await getProductSitemapChunkCount();
  return Array.from({ length: productSitemapCount + 1 }, (_, i) => ({ id: i }));
}

export default async function sitemap({ id }) {
  if (id === 0) {
    const staticPages = [
      { url: BASE_URL,                                  lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
      { url: `${BASE_URL}/ueber-uns`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
      { url: `${BASE_URL}/so-funktioniert-es`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
      { url: `${BASE_URL}/kontakt`,                     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
      { url: `${BASE_URL}/impressum`,                   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
      { url: `${BASE_URL}/datenschutz`,                 lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    ];

    // Note: intentionally not wrapped in try/catch — a DB failure here must
    // throw so Next.js's ISR keeps serving the last known-good cached sitemap
    // instead of caching an incomplete one (missing all category URLs) for
    // the next revalidate window.
    const categoryRes = await query(
      `SELECT c.slug, MAX(p.updated_at) AS last_updated
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE
       WHERE c.is_active = TRUE AND c.slug != 'sonstiges'
       GROUP BY c.slug, c.sort_order
       ORDER BY c.sort_order`
    );
    const categoryPages = categoryRes.rows.map((r) => ({
      url:             `${BASE_URL}/kategorie/${r.slug}`,
      lastModified:    r.last_updated ? new Date(r.last_updated) : new Date(),
      changeFrequency: "daily",
      priority:        0.8,
    }));

    return [...staticPages, ...categoryPages];
  }

  // Product chunks. Ordered by id (stable/immutable) rather than
  // updated_at (which shifts constantly as prices refresh) so pagination
  // across files stays consistent between crawls — sorting by a mutable
  // column would risk skipping or duplicating products across chunks.
  const offset = (id - 1) * PRODUCTS_PER_SITEMAP;
  const productRes = await query(
    `SELECT id, updated_at
     FROM products
     WHERE ${PRODUCT_SITEMAP_FILTER}
     ORDER BY id ASC
     LIMIT $1 OFFSET $2`,
    [PRODUCTS_PER_SITEMAP, offset]
  );

  return productRes.rows.map((r) => ({
    url:             `${BASE_URL}/produkt/${r.id}`,
    lastModified:    r.updated_at ? new Date(r.updated_at) : new Date(),
    changeFrequency: "daily",
    priority:        0.7,
  }));
}
