"use client";
import { useEffect } from "react";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PriceDisplay from "@/components/PriceDisplay";

export default function ProductModal({ product, onClose, onBuy }) {
  // Close on Escape key
  useEffect(() => {
    if (!product) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [product, onClose]);

  if (!product) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          zIndex: 1050, backdropFilter: "blur(2px)",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 1051, width: "min(560px, 95vw)",
          background: "#fff", borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
      >
        {/* Header */}
        <div style={{ background: "#1A3A6B", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{product.title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: "0 4px" }} aria-label="Schließen">×</button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Product info row */}
          <div style={{ display: "flex", gap: 14, marginBottom: 16 }}>
            <img
              src={product.image || "/placeholder.png"}
              alt={product.title}
              onError={(e) => { e.target.src = "/placeholder.png"; }}
              style={{ width: 90, height: 90, objectFit: "contain", borderRadius: 8, border: "1px solid #eee", flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              {product.vendor && (
                <p className="text-muted mb-1" style={{ fontSize: "0.8rem" }}>
                  Händler: <strong>{product.vendor}</strong>
                </p>
              )}
              <PriceDisplay price={product.price} oldPrice={product.old_price} size="lg" />
              <p style={{ fontSize: "0.72rem", color: "#888", marginTop: 4 }}>
                Inkl. MwSt. · Preis beim Händler prüfen
              </p>
            </div>
          </div>

          {/* Price History Chart */}
          <div style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <PriceHistoryChart productId={product.id} />
          </div>

          {/* CTA */}
          <a
            href={product.url}
            target="_blank"
            rel="noopener sponsored"
            onClick={() => { onBuy && onBuy(product); }}
            className="btn w-100 fw-bold"
            style={{ background: "#F07D00", color: "#fff", borderRadius: 8, padding: "10px 0", fontSize: 15 }}
          >
            Zum Angebot beim Händler →
          </a>
          <p style={{ fontSize: "0.68rem", color: "#aaa", textAlign: "center", marginTop: 6, marginBottom: 0 }}>
            Affiliate-Link · Preis kann abweichen
          </p>
        </div>
      </div>
    </>
  );
}
