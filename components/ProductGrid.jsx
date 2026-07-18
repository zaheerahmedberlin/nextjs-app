// components/ProductGrid.jsx
"use client";
import Link from "next/link";
import PriceDisplay from "@/components/PriceDisplay";
import ProductImage from "@/components/ProductImage";

function ProductSchema({ product }) {
  const schema = {
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
      // ── is_active + in_stock drive the schema availability ──
      availability: product.in_stock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: product.url,
      priceValidUntil: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
      seller: { "@type": "Organization", name: product.vendor || "Händler" },
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function ProductGrid({ products, onOpenProduct, formatPrice, isLoading }) {
  if (isLoading) {
    return (
      <div className="text-center py-5" role="status" aria-live="polite">
        <div className="spinner-border text-primary" style={{ width: "2.5rem", height: "2.5rem" }} />
        <p className="text-muted mt-3">Produkte werden geladen…</p>
      </div>
    );
  }
  if (!products.length) {
    return (
      <div className="text-center py-5" role="status" aria-live="polite">
        <img src="/placeholder.png" alt="Keine Produkte gefunden" style={{ maxWidth: 200, opacity: 0.5 }} />
        <p className="text-muted mt-2">Keine Produkte gefunden – bitte Filter anpassen</p>
      </div>
    );
  }

  return (
    <section aria-label="Produktliste">
      <div className="row g-3">
        {products.map((product, index) => (
          <article
            key={`${product.id}-${index}`}
            className="col-6 col-sm-4 col-md-3 col-lg-2"
          >
            {index < 12 && <ProductSchema product={product} />}

            <div className={`card h-100 shadow-sm ${!product.is_active ? "opacity-50" : ""}`}>
              {/* ── Out of stock badge ── */}
              <div className="position-relative">
                <div style={{ opacity: product.in_stock ? 1 : 0.5 }}>
                  <ProductImage src={product.image} alt={`${product.title} – Preisvergleich`} height={150} />
                </div>
                {/* ── Günstigster Preis badge ── */}
                {product.price_30d_min != null && parseFloat(product.price) <= parseFloat(product.price_30d_min) && (
                  <span
                    className="badge position-absolute top-0 start-0 m-1"
                    style={{ background: "#2d7a3a", color: "#fff", fontSize: "0.65rem", borderRadius: 4 }}
                  >
                    ↓ Günstigster Preis
                  </span>
                )}
                {/* ── Neu badge: added after launch date AND within 7 days ── */}
                {product.created_at && new Date(product.created_at) > new Date("2026-07-25") && (Date.now() - new Date(product.created_at).getTime()) < 7 * 86400000 && (
                  <span
                    className="badge position-absolute top-0 end-0 m-1"
                    style={{ background: "#F07D00", color: "#fff", fontSize: "0.65rem", borderRadius: 4 }}
                  >
                    Neu
                  </span>
                )}
                {/* ── Not in stock overlay badge ── */}
                {!product.in_stock && (
                  <span
                    className="badge bg-secondary position-absolute top-0 start-0 m-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Nicht verfügbar
                  </span>
                )}
                {/* ── Scheduled (not yet active) badge ── */}
                {!product.is_active && product.active_from && new Date(product.active_from) > new Date() && (
                  <span
                    className="badge bg-warning text-dark position-absolute top-0 end-0 m-1"
                    title={`Aktiv ab: ${new Date(product.active_from).toLocaleDateString("de-DE")}`}
                    style={{ fontSize: "0.7rem" }}
                  >
                    📅 Geplant
                  </span>
                )}
                {/* ── Expired badge ── */}
                {!product.is_active && product.active_until && new Date(product.active_until) <= new Date() && (
                  <span
                    className="badge bg-danger position-absolute top-0 end-0 m-1"
                    title={`Abgelaufen: ${new Date(product.active_until).toLocaleDateString("de-DE")}`}
                    style={{ fontSize: "0.7rem" }}
                  >
                    Abgelaufen
                  </span>
                )}
                {/* ── Generic inactive (no schedule set) ── */}
                {!product.is_active && !product.active_from && (
                  <span
                    className="badge bg-danger position-absolute top-0 end-0 m-1"
                    style={{ fontSize: "0.7rem" }}
                  >
                    Inaktiv
                  </span>
                )}
              </div>

              <div className="card-body p-2 d-flex flex-column justify-content-between">
                <h3 className="h6 text-truncate mb-1" title={product.title} itemProp="name">
                  <Link href={`/produkt/${product.id}`} className="text-decoration-none text-dark" onClick={(e) => e.stopPropagation()}>
                    {product.title}
                  </Link>
                </h3>
                {product.vendor && (
                  <p className="small text-muted mb-1">{product.vendor}</p>
                )}

                <div>
                  <PriceDisplay price={product.price} oldPrice={product.old_price} size="sm" />
                </div>

                {/* ── Stock status indicator ── */}
                <p className="mb-1" style={{ fontSize: "0.72rem" }}>
                  <span className="badge" style={{ background: "var(--pg-orange)", color: "#fff", fontWeight: 600, fontSize: "0.68rem", borderRadius: 20, padding: "2px 8px" }}>
                    Preis prüfen →
                  </span>
                </p>

                {/* ── Activation schedule display ── */}
                {product.active_from && (
                  <p className="mb-1 text-muted" style={{ fontSize: "0.68rem" }}>
                    {/* Show "ab DD.MM.YYYY" if not yet active */}
                    {!product.is_active && new Date(product.active_from) > new Date()
                      ? `🕐 Aktiv ab ${new Date(product.active_from).toLocaleDateString("de-DE")}`
                      : null
                    }
                    {/* Show expiry countdown if active but has an end date */}
                    {product.is_active && product.active_until
                      ? `⏳ Aktiv bis ${new Date(product.active_until).toLocaleDateString("de-DE")}`
                      : null
                    }
                    {/* Show expired date */}
                    {!product.is_active && product.active_until && new Date(product.active_until) <= new Date()
                      ? `⛔ Abgelaufen seit ${new Date(product.active_until).toLocaleDateString("de-DE")}`
                      : null
                    }
                  </p>
                )}

                <div className="d-flex gap-1 mt-1">
                  <button
                    className="btn btn-sm btn-outline-secondary flex-grow-1"
                    onClick={() => onOpenProduct(product)}
                    disabled={!product.in_stock || !product.is_active}
                    aria-label={`${product.title} anzeigen – ${formatPrice(product.price)}`}
                    style={{ fontSize: "0.72rem" }}
                  >
                    {product.in_stock && product.is_active ? "Preis prüfen" : "Nicht verfügbar"}
                  </button>
                  <Link
                    href={`/produkt/${product.id}`}
                    className="btn btn-sm"
                    style={{ background: "#1A3A6B", color: "#fff", fontSize: "0.72rem" }}
                    title="Produktdetailseite"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ↗
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
