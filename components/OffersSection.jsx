// components/OffersSection.jsx
"use client";

export default function OffersSection({ activeOffers, formatPrice, countdown }) {
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
              <img
                src={offer.image || "/placeholder.png"}
                className="card-img-top"
                alt={offer.title || "Angebot"}
                onError={(e) => { e.target.src = "/placeholder.png"; }}
              />
              <div className="card-body text-center">
                <h6 className="text-truncate" title={offer.title}>{offer.title}</h6>
                <p className="small text-muted">{offer.category}</p>
                <div>
                  <span className="text-danger fw-bold">{formatPrice(offer.price)}</span>
                  <span className="text-muted text-decoration-line-through small ms-2">
                    {formatPrice(offer.oldPrice)}
                  </span>
                </div>
                <div className="small text-muted mt-1">{countdown(offer.offerEnd)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
