// app/layout.jsx – SEO-optimised shell for German price comparison market
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";

const BASE_URL = "https://www.preisgucken.de";

export const metadata = {
  metadataBase: new URL(BASE_URL),

  // ── Primary meta ──────────────────────────────────────────
  title: {
    default: "Preisgucken – Preisvergleich Deutschland | Beste Preise finden",
    template: "%s | Preisgucken – Preisvergleich",
  },
  description:
    "Preisvergleich für Elektronik, Möbel und mehr aus deutschen Online-Shops. Günstigste Preise täglich aktualisiert – kostenlos & ohne Anmeldung.",

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
        urlTemplate: `${BASE_URL}/?q={search_term_string}`,
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

        {/* Favicon & PWA */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#1A3A6B" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Preisgucken" />
        <link rel="manifest" href="/manifest.json" />

        {/* Preload LCP image (logo) */}
        <link rel="preload" as="image" href="/preis-gucken-logo.png" />

        {/* Umami Analytics (DSGVO-konform, cookieless) */}
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="e80ba141-242e-449b-b91b-59253aa91c96"
        />
      </head>
      <body>
        {children}
        <CookieBanner />
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"
          async
        />
      </body>
    </html>
  );
}
