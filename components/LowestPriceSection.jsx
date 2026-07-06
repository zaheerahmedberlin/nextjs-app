// components/LowestPriceSection.jsx
"use client";
import PriceDisplay from "@/components/PriceDisplay";

export default function LowestPriceSection({
  visibleLowestProducts,
  lowestStartIndex,
  setLowestStartIndex,
  lowestPriceProductsLength,
  visibleLowestCount,
  onOpenProduct,
}) {
  if (!lowestPriceProductsLength) return null;

  return (
    <div className="mt-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">💸 Günstigste Produkte pro Kategorie</h5>
        <div>
          <button
            className="btn btn-sm btn-outline-secondary me-2"
            disabled={lowestStartIndex === 0}
            onClick={() => setLowestStartIndex((i) => Math.max(0, i - visibleLowestCount))}
          >
            ← Zurück
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={lowestStartIndex + visibleLowestCount >= lowestPriceProductsLength}
            onClick={() =>
              setLowestStartIndex((i) =>
                Math.min(lowestPriceProductsLength - visibleLowestCount, i + visibleLowestCount)
              )
            }
          >
            Weiter →
          </button>
        </div>
      </div>

      <div className="row g-3">
        {visibleLowestProducts.map((p, index) => (
          <div key={`lowest-${p.id}-${index}`} className="col-6 col-sm-4 col-md-3 col-lg-2">
            <div className="card h-100 shadow-sm">
              <div className="card-img-top d-flex align-items-center justify-content-center bg-light" style={{ height: 150 }}>
                <i className="bi bi-box-seam text-secondary" style={{ fontSize: "3rem" }}></i>
              </div>
              <div className="card-body p-2 text-center">
                <h6 className="text-truncate" title={p.title}>{p.title}</h6>
                <p className="small text-muted mb-1">{p.category}</p>
                <p className="small text-muted mb-1">{p.vendor}</p>
                <PriceDisplay price={p.price} size="sm" />
                <button
                  className="btn btn-sm btn-outline-secondary mt-2"
                  onClick={() => onOpenProduct(p)}
                >
                  Anzeigen
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
