import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Preisgucken – Preisvergleich Deutschland";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// app/layout.jsx's og:image/twitter:image referenced /og-image.png, but that
// file never actually existed in public/ — every social share of every page
// on the site (Facebook, WhatsApp, LinkedIn, X) has been showing a broken
// image/no preview since whenever that reference was added. Fixed by
// generating the image dynamically instead of relying on a static asset,
// same approach already proven on preisgucken.com's app/opengraph-image.tsx.
export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1A3A6B 0%, #122b52 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            fontSize: 88,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: -1,
          }}
        >
          Preisgucken
          <span style={{ color: "#F5A623", fontSize: 44, marginLeft: 6 }}>.de</span>
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
            display: "flex",
          }}
        >
          Preisvergleich Deutschland – Beste Preise finden
        </div>
        <div
          style={{
            marginTop: 48,
            width: 120,
            height: 6,
            borderRadius: 3,
            background: "#F5A623",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
