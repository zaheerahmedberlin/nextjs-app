"use client";
import { useState } from "react";

export default function DealAlertBanner({ searchQuery, categorySlug, maxPrice }) {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage] = useState("");

  // Only show when the user has actually searched/filtered something
  const hasSearch = searchQuery || categorySlug;
  if (!hasSearch) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    const res  = await fetch("/api/deal-alerts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email,
        search_query:  searchQuery  || null,
        category_slug: categorySlug || null,
        max_price:     maxPrice     || null,
      }),
    });
    const data = await res.json();
    setStatus(res.ok ? "success" : "error");
    setMessage(data.message || data.error);
  }

  const label = searchQuery
    ? `„${searchQuery}"`
    : categorySlug;

  return (
    <div
      className="rounded-3 p-3 mb-3 d-flex flex-wrap align-items-center gap-3"
      style={{ background: "var(--pg-blue-light)", border: "1px solid var(--pg-blue-light)" }}
    >
      <div className="flex-grow-1">
        <div className="fw-semibold small" style={{ color: "var(--pg-blue)" }}>
          🔔 Deal-Alarm für {label}
        </div>
        <div className="text-muted" style={{ fontSize: 12 }}>
          Wir benachrichtigen dich, wenn neue Angebote verfügbar sind.
        </div>
      </div>

      {status === "success" ? (
        <div className="text-success small fw-semibold">✓ {message}</div>
      ) : (
        <form onSubmit={handleSubmit} className="d-flex gap-2 flex-wrap">
          <input
            type="email"
            className="form-control form-control-sm"
            placeholder="deine@email.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ minWidth: 200 }}
          />
          <button
            type="submit"
            className="btn btn-sm fw-semibold"
            disabled={status === "loading"}
            style={{ background: "var(--pg-orange)", color: "#fff", whiteSpace: "nowrap" }}
          >
            {status === "loading" ? "…" : "Alarm setzen"}
          </button>
          {status === "error" && (
            <div className="text-danger small w-100">{message}</div>
          )}
        </form>
      )}
    </div>
  );
}
