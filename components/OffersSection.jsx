// components/OffersSection.jsx
"use client";
import PriceDisplay from "@/components/PriceDisplay";

export default function OffersSection({ activeOffers, countdown }) {
  if (!activeOffers.length) return null;

  return (
    <div className="mt-5">
      <h5 className="mb-3">🛍️ Aktuelle Angebote</h5>
      <div className="row g-3">
        {activeOffers.map((offer, index) => (
          <div key={`offer-${offer.id}-${index}`} className="col-6 col-md-4 col-lg-3">
            <div className="card h-100 shadow-sm position-relative">
              <span
                className="badge bg-success position-absolute top-0 start-0 m-2 px-2 py-1"
                style={{ fontSize: "0.75rem" }}
              >
                Angebot!
              </span>
              <div className="card-img-top d-flex align-items-center justify-content-center bg-light" style={{ height: 150 }}>
                <i className="bi bi-box-seam text-secondary" style={{ fontSize: "3rem" }}></i>
              </div>
              <div className="card-body text-center">
                <h6 className="text-truncate" title={offer.title}>{offer.title}</h6>
                <p className="small text-muted">{offer.category}</p>
                <PriceDisplay price={offer.price} oldPrice={offer.oldPrice} size="md" />
                <div className="small text-muted mt-1">{countdown(offer.offerEnd)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
