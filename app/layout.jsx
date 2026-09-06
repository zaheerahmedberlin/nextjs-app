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
    "Preisvergleich für Elektronik, Möbel und mehr aus deutschen Online-Shops – bundesweit, von Berlin bis München. Günstigste Preise täglich aktualisiert – kostenlos & ohne Anmeldung.",

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
    "Bestpreis",
    "Preisvergleichsportal",
    "unabhängiger Preisvergleich",
    "Preisänderungen",
    "Preishistorie",
    "Preisalarm",
    "Möbel Preisvergleich",
    "Sofa kaufen",
    "Matratze kaufen",
    "Kaffeevollautomat Preisvergleich",
    "Fernseher Preisvergleich",
    "Smartphone Preisvergleich",
    "Laptop Preisvergleich",
    "Kopfhörer Preisvergleich",
    "Kleider Preisvergleich",
    "Gartenmöbel Preisvergleich",
    "Vorhänge Preisvergleich",
    "Vitamine Preisvergleich",
    "Foto Zubehör Preisvergleich",

    // City-level intent — the site is national, not city-specific, but a
    // meaningful share of "Preisvergleich <Stadt>" search volume goes to
    // whichever result mentions the city, even from a nationwide service.
    // Top 50 German cities by population; deliberately NOT in the visible
    // <title>/<meta description> since cramming 50 city names in there
    // would look spammy and hurt click-through — this array is metadata
    // only, not rendered anywhere on the page.
    "Preisvergleich Berlin", "Preisvergleich Hamburg", "Preisvergleich München",
    "Preisvergleich Köln", "Preisvergleich Frankfurt", "Preisvergleich Stuttgart",
    "Preisvergleich Düsseldorf", "Preisvergleich Leipzig", "Preisvergleich Dortmund",
    "Preisvergleich Essen", "Preisvergleich Bremen", "Preisvergleich Dresden",
    "Preisvergleich Hannover", "Preisvergleich Nürnberg", "Preisvergleich Duisburg",
    "Preisvergleich Bochum", "Preisvergleich Wuppertal", "Preisvergleich Bielefeld",
    "Preisvergleich Bonn", "Preisvergleich Münster", "Preisvergleich Mannheim",
    "Preisvergleich Karlsruhe", "Preisvergleich Augsburg", "Preisvergleich Wiesbaden",
    "Preisvergleich Mönchengladbach", "Preisvergleich Gelsenkirchen", "Preisvergleich Braunschweig",
    "Preisvergleich Kiel", "Preisvergleich Aachen", "Preisvergleich Chemnitz",
    "Preisvergleich Halle", "Preisvergleich Magdeburg", "Preisvergleich Freiburg",
    "Preisvergleich Krefeld", "Preisvergleich Lübeck", "Preisvergleich Mainz",
    "Preisvergleich Erfurt", "Preisvergleich Oberhausen", "Preisvergleich Rostock",
    "Preisvergleich Kassel", "Preisvergleich Hagen", "Preisvergleich Potsdam",
    "Preisvergleich Saarbrücken", "Preisvergleich Hamm", "Preisvergleich Mülheim an der Ruhr",
    "Preisvergleich Ludwigshafen", "Preisvergleich Leverkusen", "Preisvergleich Oldenburg",
    "Preisvergleich Osnabrück", "Preisvergleich Solingen",
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


        {/* Brand display typeface (headings only, per docs/brand-guidelines.html) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@700;900&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

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

        {/* Umami Analytics (DSGVO-konform, cookieless) — production only.
            Previously fired unconditionally, so local dev-server testing
            (any developer, any localhost session) sent real pings into the
            same dashboard as actual production visitors, with no way to
            separate the two after the fact. NODE_ENV is 'production' for
            any `next build`/`next start`, and 'development' for `next dev` —
            no extra config needed, this is set automatically either way. */}
        {process.env.NODE_ENV === "production" && (
          <script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id="e80ba141-242e-449b-b91b-59253aa91c96"
          />
        )}
      </head>
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
