// components/ProductGrid.jsx
"use client";
import PriceDisplay from "@/components/PriceDisplay";

function ProductSchema({ product }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
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

export default function ProductGrid({ products, onOpenProduct, formatPrice }) {
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
                <div
                  className="card-img-top d-flex align-items-center justify-content-center bg-light"
                  style={{ height: 150, opacity: product.in_stock ? 1 : 0.5 }}
                >
                  <i className="bi bi-box-seam text-secondary" style={{ fontSize: "3rem" }}></i>
                </div>
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
                  {product.title}
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

                <button
                  className="btn btn-sm btn-outline-secondary mt-1"
                  onClick={() => onOpenProduct(product)}
                  disabled={!product.in_stock || !product.is_active}
                  aria-label={`${product.title} anzeigen – ${formatPrice(product.price)}`}
                >
                  {product.in_stock && product.is_active ? "Zum Angebot →" : "Nicht verfügbar"}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
