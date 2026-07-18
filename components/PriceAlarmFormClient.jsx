"use client";
import { useState } from "react";

export default function PriceAlarmFormClient({ product }) {
  const [email, setEmail] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState(null);
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
      <div style={{ background: "#e6f4ea", borderRadius: 8, padding: "12px 16px", color: "#2d7a3a", fontWeight: 600 }}>
        ✓ {msg} Wir schreiben Ihnen, wenn der Preis fällt.
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="d-flex gap-2 flex-wrap">
        <input
          type="email"
          required
          placeholder="Ihre E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="form-control"
          style={{ flex: "1 1 200px", fontSize: "0.85rem" }}
        />
        <div className="d-flex align-items-center gap-1 border rounded px-2" style={{ background: "#fff", flex: "0 0 auto" }}>
          <span style={{ fontSize: "0.85rem", color: "#888" }}>Zielpreis €</span>
          <input
            type="number"
            required
            min="0.01"
            step="0.01"
            placeholder={product.price ? (parseFloat(product.price) * 0.9).toFixed(0) : ""}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={{ width: 80, border: "none", outline: "none", fontSize: "0.85rem", fontWeight: 600 }}
          />
        </div>
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn fw-bold"
          style={{ background: "#1A3A6B", color: "#fff", fontSize: "0.85rem", whiteSpace: "nowrap" }}
        >
          {status === "loading" ? "…" : "🔔 Alarm setzen"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-danger mt-2 mb-0" style={{ fontSize: "0.8rem" }}>{msg}</p>
      )}
    </form>
  );
}
