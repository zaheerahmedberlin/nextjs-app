"use client";

// Splits a price into integer + cent parts for attractive display
// e.g. 1299.99 → "1.299" + "99"
export default function PriceDisplay({ price, oldPrice, size = "md" }) {
  const n = parseFloat(price);
  if (isNaN(n)) return null;

  const formatted = new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  const [euros, cents] = formatted.split(",");

  const old = parseFloat(oldPrice);
  const hasDiscount = !isNaN(old) && old > n;
  const discount = hasDiscount ? Math.round((1 - n / old) * 100) : 0;

  const sizes = {
    sm: { main: "1rem",    sup: "0.6rem",  sym: "0.75rem" },
    md: { main: "1.35rem", sup: "0.7rem",  sym: "0.85rem" },
    lg: { main: "1.8rem",  sup: "0.85rem", sym: "1rem"    },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div className="d-inline-flex flex-column">
      <div className="d-flex align-items-start lh-1">
        {/* Euro symbol */}
        <span style={{ fontSize: s.sym, fontWeight: 700, marginTop: "3px", marginRight: "1px", color: hasDiscount ? "var(--pg-orange)" : "var(--pg-blue)" }}>
          €
        </span>
        {/* Main euro amount */}
        <span style={{ fontSize: s.main, fontWeight: 800, color: hasDiscount ? "var(--pg-orange)" : "var(--pg-blue)" }}>
          {euros}
        </span>
        {/* Superscript cents */}
        <sup style={{ fontSize: s.sup, fontWeight: 700, marginTop: "2px", color: hasDiscount ? "var(--pg-orange)" : "var(--pg-blue)" }}>
          {cents}
        </sup>
      </div>

      {hasDiscount && (
        <div className="d-flex align-items-center gap-1 mt-1">
          <span className="text-muted text-decoration-line-through" style={{ fontSize: "0.75rem" }}>
            {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(old)}
          </span>
          <span className="badge rounded-pill" style={{ fontSize: "0.62rem", backgroundColor: "var(--pg-orange)", color: "#fff" }}>
            -{discount}%
          </span>
        </div>
      )}
    </div>
  );
}
