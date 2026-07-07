import { notFound } from "next/navigation";
import Link from "next/link";
import { query } from "@/lib/db";
import PriceDisplay from "@/components/PriceDisplay";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PriceAlarmFormClient from "@/components/PriceAlarmFormClient";

export async function generateMetadata({ params }) {
  const id = parseInt(params.id);
  if (!id) return {};
  try {
    const result = await query(
      `SELECT p.title, p.description, p.image, p.price, v.name AS vendor
       FROM products p LEFT JOIN vendors v ON v.id = p.vendor_id WHERE p.id = $1`,
      [id]
    );
    if (!result.rows.length) return {};
    const p = result.rows[0];
    const price = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(p.price);
    return {
      title: `${p.title} – ${price} | Preisgucken`,
      description: `${p.title} jetzt für ${price} bei ${p.vendor || "Online-Shop"} kaufen. Preisverlauf und Preisalarm auf Preisgucken.de.`,
      openGraph: { images: p.image ? [p.image] : [] },
    };
  } catch {
    return {};
  }
}

async function getProduct(id) {
  const result = await query(
    `SELECT p.id, p.title, p.description, p.image, p.url,
            p.price, p.old_price, p.currency,
            p.category, p.ean, p.in_stock, p.is_active,
            p.active_from, p.active_until, p.updated_at,
            v.name AS vendor, v.logo_url AS vendor_logo,
            (SELECT MIN(ph.price) FROM price_history ph
             WHERE ph.product_id = p.id
               AND ph.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
               AND ph.recorded_at < CURRENT_DATE
               AND (SELECT COUNT(*) FROM price_history ph2
                    WHERE ph2.product_id = p.id
                      AND ph2.recorded_at >= CURRENT_DATE - INTERVAL '30 days') >= 7
            ) AS price_30d_min
     FROM products p
     LEFT JOIN vendors v ON v.id = p.vendor_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

function fmt(v) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);
}

export default async function ProductDetailPage({ params }) {
  const id = parseInt(params.id);
  if (!id) notFound();

  const product = await getProduct(id);
  if (!product) notFound();

  const isLowest =
    product.price_30d_min != null &&
    parseFloat(product.price) <= parseFloat(product.price_30d_min);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.image || "https://www.preisgucken.de/placeholder.png",
    description: product.description || product.title,
    brand: product.vendor ? { "@type": "Brand", name: product.vendor } : undefined,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "EUR",
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: product.url,
      priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      seller: { "@type": "Organization", name: product.vendor || "Händler" },
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: "https://www.preisgucken.de" },
      { "@type": "ListItem", position: 2, name: "Preisvergleich", item: "https://www.preisgucken.de" },
      { "@type": "ListItem", position: 3, name: product.title, item: `https://www.preisgucken.de/produkt/${product.id}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <div className="container py-4" style={{ maxWidth: 860 }}>
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb" className="mb-3">
          <ol className="breadcrumb" style={{ fontSize: "0.8rem" }}>
            <li className="breadcrumb-item"><Link href="/">Startseite</Link></li>
            <li className="breadcrumb-item"><Link href="/">Preisvergleich</Link></li>
            <li className="breadcrumb-item active" aria-current="page">{product.title}</li>
          </ol>
        </nav>

        <div className="row g-4">
          {/* Left: image */}
          <div className="col-12 col-md-4">
            <div style={{ background: "#f8faff", borderRadius: 12, padding: 16, textAlign: "center" }}>
              <img
                src={product.image || "/placeholder.png"}
                alt={product.title}
                onError={undefined}
                style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain", borderRadius: 8 }}
              />
            </div>
          </div>

          {/* Right: info */}
          <div className="col-12 col-md-8">
            {product.vendor && (
              <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
                Händler: <strong>{product.vendor}</strong>
              </p>
            )}

            <h1 className="h4 fw-bold mb-2" style={{ color: "#1A3A6B" }}>{product.title}</h1>

            {isLowest && (
              <span className="badge mb-2" style={{ background: "#2d7a3a", color: "#fff", fontSize: "0.75rem" }}>
                ↓ Günstigster Preis – 30-Tage-Tief
              </span>
            )}

            <div className="mb-1">
              <PriceDisplay price={product.price} oldPrice={product.old_price} size="lg" />
            </div>
            <p className="text-muted mb-3" style={{ fontSize: "0.78rem" }}>
              Inkl. MwSt. · Preis beim Händler prüfen
            </p>

            {!product.in_stock && (
              <p className="text-danger mb-2" style={{ fontSize: "0.82rem" }}>⚠️ Derzeit nicht verfügbar</p>
            )}

            <a
              href={product.url}
              target="_blank"
              rel="noopener sponsored"
              className="btn fw-bold w-100 mb-2"
              style={{ background: "#F07D00", color: "#fff", borderRadius: 8, padding: "12px 0", fontSize: 16 }}
            >
              Zum Angebot beim Händler →
            </a>
            <p style={{ fontSize: "0.68rem", color: "#aaa", textAlign: "center" }}>
              Affiliate-Link · Preis kann abweichen
            </p>
          </div>
        </div>

        {/* Price History Chart */}
        <div className="mt-4" style={{ background: "#f8faff", borderRadius: 12, padding: "16px 20px" }}>
          <PriceHistoryChart productId={product.id} />
        </div>

        {/* Preisalarm */}
        <div className="mt-3" style={{ background: "#f0f4fa", borderRadius: 12, padding: "16px 20px" }}>
          <p className="fw-bold mb-2" style={{ fontSize: "0.9rem", color: "#1A3A6B" }}>🔔 Preisalarm setzen</p>
          <p className="text-muted mb-3" style={{ fontSize: "0.8rem" }}>
            Wir benachrichtigen Sie per E-Mail, sobald der Preis auf Ihren Wunschpreis fällt.
          </p>
          <PriceAlarmFormClient product={product} />
        </div>

        {/* Product details */}
        {(product.description || product.ean) && (
          <div className="mt-4" style={{ background: "#fff", borderRadius: 12, border: "1px solid #eef0f8", padding: "16px 20px" }}>
            <h2 className="h6 fw-bold mb-3" style={{ color: "#1A3A6B" }}>Produktdetails</h2>
            {product.description && (
              <p style={{ fontSize: "0.85rem", color: "#555", lineHeight: 1.6 }}>{product.description}</p>
            )}
            {product.ean && (
              <p className="text-muted mb-0" style={{ fontSize: "0.78rem" }}>EAN: {product.ean}</p>
            )}
            {product.updated_at && (
              <p className="text-muted mb-0" style={{ fontSize: "0.78rem" }}>
                Zuletzt aktualisiert: {new Date(product.updated_at).toLocaleDateString("de-DE")}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
