// app/sitemap.xml/route.js
//
// app/sitemap.js exports generateSitemaps(), which makes Next.js serve the
// chunks at /sitemap/0.xml, /sitemap/1.xml, ... — it does NOT also create an
// index at the conventional /sitemap.xml path. Search-adjacent tools and
// crawlers commonly probe that exact URL regardless of what's declared in
// robots.txt, so a plain 404 there looks broken even though the real
// sitemaps are fine. This serves a standard sitemap index pointing at every
// chunk instead.
import { getProductSitemapChunkCount } from "@/lib/sitemap";

const BASE_URL = "https://www.preisgucken.de";

export const revalidate = 3600;

export async function GET() {
  const productSitemapCount = await getProductSitemapChunkCount();
  const urls = Array.from(
    { length: productSitemapCount + 1 },
    (_, i) => `${BASE_URL}/sitemap/${i}.xml`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <sitemap><loc>${u}</loc></sitemap>`).join("\n")}
</sitemapindex>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
