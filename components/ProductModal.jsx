"use client";
import { useEffect, useState } from "react";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import PriceDisplay from "@/components/PriceDisplay";
import { buildAffiliateUrl } from "@/lib/affiliate";

function PriceAlarmForm({ product }) {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "ok" | "error"
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/price-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, productId: product.id, targetPrice: parseFloat(target) }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("ok");
        setMsg(data.message || "Preisalarm gesetzt!");
      } else {
        setStatus("error");
        setMsg(data.error || "Fehler beim Setzen des Alarms.");
      }
    } catch {
      setStatus("error");
      setMsg("Netzwerkfehler – bitte erneut versuchen.");
    }
  }

  if (status === "ok") {
    return (
      <div style={{ background: "#e6f4ea", borderRadius: 8, padding: "10px 14px", fontSize: "0.8rem", color: "#2d7a3a", fontWeight: 600 }}>
        ✓ {msg} Wir schreiben Ihnen, wenn der Preis fällt.
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <input
          type="email"
          required
          placeholder="Ihre E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ flex: "1 1 160px", border: "1px solid #dde3f0", borderRadius: 6, padding: "6px 10px", fontSize: "0.8rem", outline: "none" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 4, border: "1px solid #dde3f0", borderRadius: 6, padding: "6px 10px", background: "#fff" }}>
          <span style={{ fontSize: "0.8rem", color: "#888" }}>Zielpreis €</span>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder={product.price ? (parseFloat(product.price) * 0.9).toFixed(0) : ""}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ width: 70, border: "none", outline: "none", fontSize: "0.8rem", fontWeight: 600 }}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          style={{ background: "#1A3A6B", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {status === "loading" ? "…" : "🔔 Alarm setzen"}
        </button>
      </div>
      {status === "error" && (
        <p style={{ color: "#e53935", fontSize: "0.72rem", margin: "4px 0 0" }}>{msg}</p>
      )}
    </form>
  );
}

export default function ProductModal({ product, onClose, onBuy }) {
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
          zIndex: 1051, width: "min(580px, 95vw)",
          background: "#fff", borderRadius: 14,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
          overflow: "hidden", maxHeight: "90vh", overflowY: "auto",
        }}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
      >
        {/* Header */}
        <div style={{ background: "#1A3A6B", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, position: "sticky", top: 0, zIndex: 1 }}>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{product.title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, lineHeight: 1, cursor: "pointer", padding: "0 4px" }} aria-label="Schließen">×</button>
        </div>

        <div style={{ padding: 16 }}>
          {/* Product info row */}
          <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
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
              <p style={{ fontSize: "0.72rem", color: "#888", marginTop: 4, marginBottom: 0 }}>
                Inkl. MwSt. · Preis beim Händler prüfen
              </p>
            </div>
          </div>

          {/* Price History Chart */}
          <div style={{ background: "#f8faff", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <PriceHistoryChart productId={product.id} />
          </div>

          {/* Preisalarm */}
          <div style={{ background: "#f0f4fa", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
            <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#1A3A6B", marginBottom: 8 }}>
              🔔 Preisalarm setzen
            </p>
            <PriceAlarmForm product={product} />
          </div>

          {/* CTA */}
          <a
            href={buildAffiliateUrl(product.url, product.vendor)}
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
