// app/robots.js
// Next.js auto-generates /robots.txt from this file.
import { getProductSitemapChunkCount } from "@/lib/sitemap";

const BASE_URL = "https://www.preisgucken.de";

export const revalidate = 3600;

export default async function robots() {
  // Sitemaps are split across multiple files (app/sitemap.js) — there's no
  // single /sitemap.xml index, so every file must be listed explicitly.
  const productSitemapCount = await getProductSitemapChunkCount();
  const sitemapUrls = Array.from(
    { length: productSitemapCount + 1 },
    (_, i) => `${BASE_URL}/sitemap/${i}.xml`
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/"],
      },
    ],
    sitemap: sitemapUrls,
    host: BASE_URL,
  };
}
