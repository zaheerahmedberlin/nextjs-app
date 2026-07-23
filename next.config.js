// next.config.js
// Basic Next.js config — no changes needed from defaults for this project.
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["fluent-ffmpeg", "ffmpeg-static", "sharp"],
};

module.exports = nextConfig;
