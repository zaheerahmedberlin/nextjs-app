"use client";
import { useEffect, useRef, useState } from "react";

export default function PriceHistoryChart({ productId }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let destroyed = false;

    async function load() {
      setLoading(true);
      setEmpty(false);

      try {
        const res = await fetch(`/api/products/${productId}/price-history?days=90`);
        const data = await res.json();

        if (destroyed) return;

        if (!data.history?.length) { setEmpty(true); setLoading(false); return; }

        setStats(data.stats);

        // Lazy-load Chart.js only when needed
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);

        if (destroyed) return;

        // Destroy previous chart instance if re-opening
        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

        const labels = data.history.map((r) => {
          const d = new Date(r.date);
          return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
        });
        const prices = data.history.map((r) => r.price);

        chartRef.current = new Chart(canvasRef.current, {
          type: "line",
          data: {
            labels,
            datasets: [{
              data: prices,
              borderColor: "#1A3A6B",
              backgroundColor: "rgba(26,58,107,0.08)",
              borderWidth: 2,
              fill: true,
              tension: 0.3,
              pointRadius: prices.length <= 14 ? 3 : 0,
              pointHoverRadius: 5,
              pointBackgroundColor: "#F07D00",
              pointBorderColor: "#fff",
              pointBorderWidth: 2,
            }],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) =>
                    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(ctx.parsed.y),
                },
                backgroundColor: "#1A3A6B",
                titleColor: "rgba(255,255,255,0.7)",
                bodyColor: "#fff",
                padding: 8,
                cornerRadius: 6,
              },
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: {
                  font: { size: 10 },
                  color: "#999",
                  maxTicksLimit: 6,
                  maxRotation: 0,
                },
              },
              y: {
                grid: { color: "#f0f0f0" },
                ticks: {
                  font: { size: 10 },
                  color: "#999",
                  callback: (v) =>
                    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v),
                },
              },
            },
          },
        });
      } catch (e) {
        console.error("PriceHistoryChart:", e);
        if (!destroyed) setEmpty(true);
      } finally {
        if (!destroyed) setLoading(false);
      }
    }

    load();
    return () => {
      destroyed = true;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [productId]);

  const fmt = (v) =>
    v != null
      ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v)
      : "–";

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="fw-bold small" style={{ color: "#1A3A6B" }}>Preisverlauf (90 Tage)</span>
        {stats && (
          <div className="d-flex gap-3" style={{ fontSize: "0.72rem" }}>
            <span><span style={{ color: "#2d7a3a", fontWeight: 700 }}>▼ Tief:</span> {fmt(stats.min)}</span>
            <span><span style={{ color: "#F07D00", fontWeight: 700 }}>● Aktuell:</span> {fmt(stats.current)}</span>
            <span><span style={{ color: "#e53935", fontWeight: 700 }}>▲ Hoch:</span> {fmt(stats.max)}</span>
          </div>
        )}
      </div>

      {loading && (
        <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="spinner-border spinner-border-sm text-secondary" role="status" />
        </div>
      )}

      {empty && !loading && (
        <p className="text-muted small text-center py-3 mb-0">
          Noch keine Preisdaten vorhanden – wird täglich aktualisiert.
        </p>
      )}

      <div style={{ height: 130, display: loading || empty ? "none" : "block" }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
