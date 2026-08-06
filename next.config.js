// next.config.js
// Basic Next.js config — no changes needed from defaults for this project.
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "sharp"],
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "preisgucken.de" }],
        destination: "https://www.preisgucken.de/:path*",
        permanent: true,
      },
    ];
  },
  // /sitemap.xml itself can't be a literal file route — see the comment in
  // app/sitemap-index/route.js — so route external requests for it there
  // instead, keeping the public URL crawlers expect.
  async rewrites() {
    return [{ source: "/sitemap.xml", destination: "/sitemap-index" }];
  },
};

module.exports = nextConfig;
