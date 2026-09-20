// app/sitemap.js — dynamically built from real DB data. Served directly at
// the standard /sitemap.xml by Next.js's file convention.
//
// Simplified 2026-09-20 from a 27-file split (app/sitemap-index/route.js +
// generateSitemaps() chunking into /sitemap/0.xml.../26.xml) back down to
// this single file. That split existed only because of Google's 50,000-
// URL-per-file cap, which mattered when the sitemap carried ~505,000
// individual /produkt/ pages. Those are now noindex and removed from the
// sitemap entirely (see the "noindex all product pages" commit) — with
// only ~270 category + static URLs left, a single file is standard,
// simpler, and won't approach the cap for a very long time even as the
// catalog grows. Old /sitemap/0.xml.../26.xml URLs (and the sitemap-index
// route) are gone; robots.js now points only at /sitemap.xml.
import { query } from "@/lib/db";

const BASE_URL = "https://www.preisgucken.de";

export const revalidate = 3600; // regenerate hourly so new categories appear without a deploy

export default async function sitemap() {
  // Audited 2026-09-20 against the real app/ directory (find app -maxdepth
  // 2 -name "page.jsx") after a user question about the sitemap's page
  // count exposed that 5 real, live, index/follow pages had never been in
  // this list at all: agb, cookie-einstellungen, gutscheine,
  // affiliate-programm, and haendler-registrierung (the vendor
  // registration page) — all verified 200 + "index, follow" before adding.
  // Every page under app/ that isn't kategorie/produkt/api/admin/vendor
  // should be listed here; re-run that find command to check for drift if
  // new top-level pages get added later.
  const staticPages = [
    { url: BASE_URL,                                  lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE_URL}/ueber-uns`,                   lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE_URL}/so-funktioniert-es`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/gutscheine`,                  lastModified: new Date(), changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE_URL}/affiliate-programm`,          lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/haendler-registrierung`,      lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/kontakt`,                     lastModified: new Date(), changeFrequency: "yearly",  priority: 0.4 },
    { url: `${BASE_URL}/impressum`,                   lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/datenschutz`,                 lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/agb`,                         lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
    { url: `${BASE_URL}/cookie-einstellungen`,        lastModified: new Date(), changeFrequency: "yearly",  priority: 0.3 },
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
