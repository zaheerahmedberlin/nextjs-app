// app/gutscheine/page.jsx
// Server-rendered coupon/voucher listing — public, crawlable
import { query } from "@/lib/db";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CouponCodeButton from "@/components/CouponCodeButton";

const BASE_URL = "https://www.preisgucken.de";

// No dynamic API usage in this server component, so Next.js would otherwise
// statically render it once at build time and cache that snapshot forever —
// hiding every coupon added or expired after the last deploy, since the
// active-window filter depends on NOW() at request time.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Gutscheine & Rabattcodes",
  description: "Aktuelle Gutscheincodes und Rabattaktionen unserer Partner-Shops – täglich aktualisiert, kostenlos und ohne Anmeldung.",
  alternates: { canonical: `${BASE_URL}/gutscheine` },
};

function formatDiscount(c) {
  if (!c.discount_value) return null;
  return c.discount_type === "fixed"
    ? `${Number(c.discount_value).toLocaleString("de-DE")} € Rabatt`
    : `${Number(c.discount_value).toLocaleString("de-DE")}% Rabatt`;
}

function truncate(text, maxLen = 180) {
  // AWIN's raw terms text is often a full legal paragraph (brand
  // exclusions, payout restrictions, etc.) — fine to keep in full in the
  // DB for reference, but unreadable as a card summary on the public
  // page. Cut at the last whole word within the limit rather than
  // mid-word.
  if (!text || text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxLen)}…`;
}

function formatDate(d) {
  // Includes time, not just the date — AWIN promo codes commonly specify
  // an exact cutoff time (e.g. "31/08/2026 10:59"), and showing only the
  // date would make a code look valid for hours after it's actually expired.
  //
  // Explicit timeZone is required here: this runs server-side (Railway's
  // container clock is UTC), so without it the raw UTC hour gets labeled
  // as if it were already German local time — showing every coupon as
  // expiring ~2 hours earlier than it actually does.
  return d ? new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : null;
}

export default async function GutscheinePage() {
  let coupons = [];
  try {
    const result = await query(`
      SELECT c.id, c.code, c.title, c.description, c.discount_type, c.discount_value,
             c.valid_from, c.valid_until, c.tracking_url,
             v.name AS vendor_name, v.slug AS vendor_slug, v.logo_url AS vendor_logo
      FROM coupons c
      JOIN vendors v ON v.id = c.vendor_id AND v.is_active = TRUE
      WHERE c.is_active = TRUE
        AND (c.valid_from  IS NULL OR c.valid_from  <= NOW())
        AND (c.valid_until IS NULL OR c.valid_until >= NOW())
      ORDER BY c.valid_until ASC NULLS LAST, c.created_at DESC
    `);
    coupons = result.rows;
  } catch (err) {
    console.error("Gutscheine page query error:", err);
  }

  return (
    <>
      <Navbar />

      <header className="bg-light border-bottom py-4">
        <div className="container">
          <h1 className="mb-1 fw-bold">Gutscheine &amp; Rabattcodes</h1>
          <p className="text-muted mb-3">
            Aktuelle Gutscheincodes unserer Partner-Shops – täglich geprüft, kostenlos.
          </p>
          <div className="d-flex flex-wrap gap-3 gap-md-4 small text-muted">
            <span>① Code antippen zum Kopieren</span>
            <span>② Zum Shop wechseln</span>
            <span>③ Code beim Bezahlen einfügen</span>
          </div>
        </div>
      </header>

      <main className="container py-4">
        {coupons.length > 0 ? (
          <div className="row g-3">
            {coupons.map((c) => (
              <div key={c.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body d-flex flex-column">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      {c.vendor_logo && (
                        <img src={c.vendor_logo} alt={c.vendor_name} style={{ height: 20, objectFit: "contain" }} />
                      )}
                      <span className="small text-muted">{c.vendor_name}</span>
                    </div>
                    <h2 className="h6 fw-bold mb-1">{c.title}</h2>
                    {formatDiscount(c) && (
                      <p className="fw-bold mb-2" style={{ color: "var(--pg-blue, #1A3A6B)" }}>
                        {formatDiscount(c)}
                      </p>
                    )}
                    {c.description && <p className="small text-muted mb-3">{truncate(c.description)}</p>}
                    <div className="mt-auto">
                      <CouponCodeButton code={c.code} />
                      {formatDate(c.valid_until) && (
                        <p className="small text-muted mb-2">Gültig bis {formatDate(c.valid_until)}</p>
                      )}
                      <a
                        href={c.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="btn btn-sm btn-outline-secondary w-100"
                      >
                        Zum Shop →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted py-5 text-center">
            Aktuell keine aktiven Gutscheine verfügbar. <a href="/">Zum Preisvergleich</a>
          </p>
        )}
      </main>

      <Footer />
    </>
  );
}
