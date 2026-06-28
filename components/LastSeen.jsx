// components/LastSeen.jsx
"use client";

import { useState, useEffect } from "react";

export default function LastSeen({ formatPrice, onOpenProduct }) {
  const [lastSeenProducts, setLastSeenProducts] = useState([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("lastSeenProducts") || "[]");
      setLastSeenProducts(data);
    } catch {
      setLastSeenProducts([]);
    }
  }, []);

  function clearLastSeen() {
    localStorage.removeItem("lastSeenProducts");
    setLastSeenProducts([]);
  }

  if (!lastSeenProducts.length) return null;

  return (
    <div className="mt-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">🕒 Zuletzt angesehen</h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={clearLastSeen}>
          Verlauf löschen
        </button>
      </div>

      <div className="row g-3">
        {lastSeenProducts.map((p, index) => (
          <div key={`seen-${p.id}-${index}`} className="col-6 col-sm-4 col-md-3 col-lg-2">
            <div
              className="card h-100 small-card text-center"
              style={{ cursor: "pointer" }}
              onClick={() => onOpenProduct(p)}
            >
              <img
                src={p.image || "/placeholder.png"}
                className="card-img-top"
                alt={p.title || "Produkt"}
                onError={(e) => { e.target.src = "/placeholder.png"; }}
              />
              <div className="card-body p-2">
                <h6 className="text-truncate" title={p.title}>{p.title}</h6>
                <h6 className="text-truncate small text-muted" title={p.vendor}>{p.vendor}</h6>
                <div className="fw-semibold text-price">{formatPrice(p.price)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
