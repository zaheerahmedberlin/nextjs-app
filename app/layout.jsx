// app/layout.jsx – SEO-optimised shell for German price comparison market
import "./globals.css";

const BASE_URL = "https://www.preisgucken.de";

export const metadata = {
  metadataBase: new URL(BASE_URL),

  // ── Primary meta ──────────────────────────────────────────
  title: {
    default: "Preisgucken – Preisvergleich Deutschland | Beste Preise finden",
    template: "%s | Preisgucken – Preisvergleich",
  },
  description:
    "Preisvergleich für über 400 Millionen Produkte in Deutschland. Finden Sie die günstigsten Preise für Elektronik, Möbel, Mode und mehr. Kostenlos & aktuell.",

  // ── Keywords (German market focused) ──────────────────────
  keywords: [
    "Preisvergleich",
    "Preisvergleich Deutschland",
    "günstigste Preise",
    "Preise vergleichen",
    "billiger kaufen",
    "Schnäppchen",
    "Angebote heute",
    "Preissuchmaschine",
    "Produktvergleich",
    "online einkaufen günstig",
    "Elektronik Preisvergleich",
    "Preis gucken",
  ],

  // ── Canonical & alternates ─────────────────────────────────
  alternates: {
    canonical: BASE_URL,
    languages: { "de-DE": BASE_URL },
  },

  // ── Open Graph (Facebook, WhatsApp, LinkedIn shares) ──────
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: BASE_URL,
    siteName: "Preisgucken",
    title: "Preisgucken – Preisvergleich Deutschland",
    description:
      "Vergleiche Preise von Millionen Produkten. Spare Geld beim Online-Shopping in Deutschland.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Preisgucken – Preisvergleich Deutschland",
      },
    ],
  },

  // ── Twitter / X card ──────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Preisgucken – Preisvergleich Deutschland",
    description: "Finde die besten Preise für Millionen Produkte in Deutschland.",
    images: ["/og-image.png"],
  },

  // ── Robots ────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ── Verification (add your real tokens) ───────────────────
  verification: {
    google: "YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN",
  },
};

export default function RootLayout({ children }) {
  // ── Organisation structured data (shown in Google Knowledge Panel) ──
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Preisgucken",
    url: BASE_URL,
    logo: `${BASE_URL}/preis-gucken-logo.png`,
    description:
      "Deutschlands smarte Preissuchmaschine – Preise vergleichen und sparen.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "b2b@preisgucken.de",
      availableLanguage: "German",
    },
    sameAs: ["https://www.linkedin.com/company/preisgucken"],
  };

  // ── WebSite schema (enables Google Sitelinks search box) ──
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Preisgucken",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/suche?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="de">
      <head>
        {/* Structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />

        {/* Preconnect for faster CDN loads */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />

        {/* Bootstrap CSS */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        />
        {/* Bootstrap Icons */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
        />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        {children}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
}
