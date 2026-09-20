// app/robots.js
// Next.js auto-generates /robots.txt from this file.
//
// Simplified 2026-09-20 — used to compute a dynamic list of N sitemap chunk
// URLs (/sitemap/0.xml.../26.xml) since app/sitemap.js split the catalog
// across files to stay under Google's 50,000-URL-per-file cap. Products are
// now noindex and out of the sitemap entirely, leaving ~270 category/static
// URLs — small enough for the single, standard /sitemap.xml that Next.js's
// file convention now serves directly (no more generateSitemaps() chunking,
// no more separate sitemap-index route/rewrite).

const BASE_URL = "https://www.preisgucken.de";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
