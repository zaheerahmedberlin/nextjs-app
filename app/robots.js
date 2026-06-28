// app/robots.js
// Next.js auto-generates /robots.txt from this file.

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/", "/admin/"],
      },
    ],
    sitemap: "https://www.preisgucken.de/sitemap.xml",
    host: "https://www.preisgucken.de",
  };
}
