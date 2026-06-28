// components/ProductGrid.jsx – SEO: Product schema per card, semantic article tags
"use client";

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
      availability: "https://schema.org/InStock",
      url: product.url,
      priceValidUntil: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
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
    // itemScope / itemType = Microdata fallback alongside JSON-LD
    <section aria-label="Produktliste">
      <div className="row g-3">
        {products.map((product, index) => (
          <article
            key={`${product.id}-${index}`}
            className="col-6 col-sm-4 col-md-3 col-lg-2"
            itemScope
            itemType="https://schema.org/Product"
          >
            {/* Inject per-product JSON-LD for first 12 visible products */}
            {index < 12 && <ProductSchema product={product} />}

            <div className="card h-100 shadow-sm">
              <img
                src={product.image || "/placeholder.png"}
                className="card-img-top"
                alt={`${product.title} – Preisvergleich`}
                loading="lazy"
                width={300}
                height={150}
                onError={(e) => { e.target.src = "/placeholder.png"; }}
                itemProp="image"
              />
              <div className="card-body p-2 d-flex flex-column justify-content-between">
                <h3 className="h6 text-truncate mb-1" title={product.title} itemProp="name">
                  {product.title}
                </h3>
                {product.vendor && (
                  <p className="small text-muted mb-1" itemProp="brand">{product.vendor}</p>
                )}
                <div
                  className="fw-semibold text-price"
                  itemProp="offers"
                  itemScope
                  itemType="https://schema.org/Offer"
                >
                  <span itemProp="price" content={product.price}>
                    {formatPrice(product.price)}
                  </span>
                  <meta itemProp="priceCurrency" content="EUR" />
                  <meta itemProp="availability" content="https://schema.org/InStock" />
                </div>
                <button
                  className="btn btn-sm btn-outline-secondary mt-2"
                  onClick={() => onOpenProduct(product)}
                  aria-label={`${product.title} anzeigen – ${formatPrice(product.price)}`}
                >
                  Zum Angebot →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
