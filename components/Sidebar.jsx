// components/Sidebar.jsx
"use client";

export default function Sidebar({
  categories,
  selectedCategories,
  setSelectedCategories,
  maxPriceFilter,
  setMaxPriceFilter,
  defaultMaxPrice,
  formatPrice,
  showOutOfStock,
  setShowOutOfStock,
  showInactiveProducts,
  setShowInactiveProducts,
  activeFromFilter,
  setActiveFromFilter,
  activeUntilFilter,
  setActiveUntilFilter,
}) {
  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  return (
    <aside className="col-12 col-md-3 col-lg-2 mb-3 mb-md-0">

      {/* ── Categories ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Kategorien</div>
        <div className="card-body overflow-auto" style={{ maxHeight: "40vh" }}>
          {categories.map((cat) => (
            <div key={cat} className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={`cat-${cat}`}
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <label className="form-check-label small" htmlFor={`cat-${cat}`}>
                {cat}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* ── Price filter ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Preisfilter</div>
        <div className="card-body">
          <label htmlFor="priceRange" className="form-label d-flex justify-content-between">
            <span className="small fw-semibold">Bis</span>
            <span className="text-muted small">max: {formatPrice(defaultMaxPrice)}</span>
          </label>
          <input
            type="range"
            className="form-range"
            id="priceRange"
            value={maxPriceFilter}
            onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
            min={0}
            max={defaultMaxPrice}
            step={1}
          />
          <div className="input-group input-group-sm mt-1">
            <span className="input-group-text">€</span>
            <input
              type="number"
              className="form-control"
              value={maxPriceFilter}
              min={0}
              max={defaultMaxPrice}
              onChange={(e) => {
                const v = Math.min(Number(e.target.value), defaultMaxPrice);
                setMaxPriceFilter(v < 0 ? 0 : v);
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Availability filter ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Verfügbarkeit</div>
        <div className="card-body">

          {/* in_stock toggle */}
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="toggleInStock"
              checked={!showOutOfStock}
              onChange={(e) => setShowOutOfStock(!e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="toggleInStock">
              Nur verfügbare Artikel
            </label>
          </div>

          {/* is_active toggle */}
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="toggleActive"
              checked={showInactiveProducts}
              onChange={(e) => setShowInactiveProducts(e.target.checked)}
            />
            <label className="form-check-label small" htmlFor="toggleActive">
              Inaktive Produkte anzeigen
            </label>
          </div>

          {/* ── Active schedule date range filter ── */}
          <div className="border-top pt-2">
            <p className="small fw-semibold mb-2 text-muted">Aktivierungszeitraum</p>

            <label className="form-label small mb-1" htmlFor="activeFrom">
              Aktiv ab
            </label>
            <input
              type="date"
              className="form-control form-control-sm mb-2"
              id="activeFrom"
              value={activeFromFilter}
              onChange={(e) => setActiveFromFilter(e.target.value)}
            />

            <label className="form-label small mb-1" htmlFor="activeUntil">
              Aktiv bis
            </label>
            <input
              type="date"
              className="form-control form-control-sm mb-2"
              id="activeUntil"
              value={activeUntilFilter}
              min={activeFromFilter || undefined}
              onChange={(e) => setActiveUntilFilter(e.target.value)}
            />

            {(activeFromFilter || activeUntilFilter) && (
              <button
                className="btn btn-sm btn-outline-secondary w-100"
                onClick={() => { setActiveFromFilter(""); setActiveUntilFilter(""); }}
              >
                Datum zurücksetzen
              </button>
            )}
          </div>

        </div>
      </div>

    </aside>
  );
}
