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
};

module.exports = nextConfig;
