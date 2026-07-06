// components/LastSeen.jsx
"use client";

import { useState, useEffect } from "react";
import PriceDisplay from "@/components/PriceDisplay";

export default function LastSeen({ onOpenProduct }) {
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
              <div className="card-img-top d-flex align-items-center justify-content-center bg-light" style={{ height: 100 }}>
                <i className="bi bi-box-seam text-secondary" style={{ fontSize: "2rem" }}></i>
              </div>
              <div className="card-body p-2">
                <h6 className="text-truncate" title={p.title}>{p.title}</h6>
                <h6 className="text-truncate small text-muted" title={p.vendor}>{p.vendor}</h6>
                <PriceDisplay price={p.price} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
