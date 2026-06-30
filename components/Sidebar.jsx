"use client";
import { useState } from "react";

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
  const price = maxPriceFilter || 0;
  // Track which parent groups are expanded
  const [expanded, setExpanded] = useState({});

  function handlePriceChange(v) {
    const clamped = Math.min(Math.max(0, Number(v) || 0), defaultMaxPrice);
    setMaxPriceFilter(clamped);
  }

  function toggleCategory(slug) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
  }

  function toggleExpand(slug) {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  // categories is now a tree: [{id, slug, name, children: [...]}]
  const isTree = categories.length > 0 && "children" in categories[0];

  return (
    <aside className="col-12 col-md-3 col-lg-2 mb-3 mb-md-0">

      {/* ── Categories ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Kategorien</div>
        <div className="card-body overflow-auto p-0" style={{ maxHeight: "45vh" }}>
          {isTree ? (
            <ul className="list-unstyled mb-0">
              {categories.map((parent) => {
                const isOpen = expanded[parent.slug] !== false; // default open
                const parentSelected = selectedCategories.includes(parent.slug);
                const hasChildren = parent.children?.length > 0;
                const rollupCount = hasChildren
                  ? parent.children.reduce((sum, c) => sum + c.productCount, 0)
                  : parent.productCount;

                if (rollupCount === 0) return null; // hide empty categories

                return (
                  <li key={parent.slug} className="border-bottom">
                    {/* Parent row */}
                    <div
                      className="d-flex align-items-center px-3 py-2 gap-2 sidebar-cat-row"
                      style={{ cursor: hasChildren ? "pointer" : "default", userSelect: "none" }}
                      onClick={() => hasChildren && toggleExpand(parent.slug)}
                    >
                      <input
                        className="form-check-input mt-0 flex-shrink-0"
                        type="checkbox"
                        id={`cat-${parent.slug}`}
                        checked={parentSelected}
                        onChange={() => toggleCategory(parent.slug)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label
                        className="form-check-label small fw-semibold flex-grow-1 mb-0"
                        htmlFor={`cat-${parent.slug}`}
                        style={{ cursor: "pointer" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {parent.name}
                        <span className="text-muted fw-normal ms-1">({rollupCount})</span>
                      </label>
                      {hasChildren && (
                        <span
                          className="text-muted"
                          style={{
                            fontSize: 10,
                            transition: "transform 0.2s",
                            transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
                          }}
                        >
                          ▼
                        </span>
                      )}
                    </div>

                    {/* Children */}
                    {hasChildren && isOpen && (
                      <ul className="list-unstyled mb-0" style={{ background: "var(--pg-blue-light)" }}>
                        {parent.children.filter((c) => c.productCount > 0).map((child) => (
                          <li key={child.slug}>
                            <div className="d-flex align-items-center px-4 py-1 gap-2 sidebar-cat-row">
                              <input
                                className="form-check-input mt-0 flex-shrink-0"
                                type="checkbox"
                                id={`cat-${child.slug}`}
                                checked={selectedCategories.includes(child.slug)}
                                onChange={() => toggleCategory(child.slug)}
                              />
                              <label
                                className="form-check-label small mb-0 flex-grow-1"
                                htmlFor={`cat-${child.slug}`}
                                style={{ cursor: "pointer" }}
                              >
                                {child.name}
                                <span className="text-muted ms-1">({child.productCount})</span>
                              </label>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            // Fallback: flat list (old format)
            <div className="p-2">
              {categories.map((cat) => (
                <div key={cat.slug || cat} className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`cat-${cat.slug || cat}`}
                    checked={selectedCategories.includes(cat.slug || cat)}
                    onChange={() => toggleCategory(cat.slug || cat)}
                  />
                  <label className="form-check-label small" htmlFor={`cat-${cat.slug || cat}`}>
                    {cat.name || cat}
                  </label>
                </div>
              ))}
            </div>
          )}
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
            value={price}
            onChange={(e) => handlePriceChange(e.target.value)}
            min={0}
            max={defaultMaxPrice || 10000}
            step={1}
          />
          <div className="input-group input-group-sm mt-1">
            <span className="input-group-text">€</span>
            <input
              type="number"
              className="form-control"
              value={price}
              min={0}
              max={defaultMaxPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Availability filter ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Verfügbarkeit</div>
        <div className="card-body">
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

          <div className="border-top pt-2">
            <p className="small fw-semibold mb-2 text-muted">Aktivierungszeitraum</p>
            <label className="form-label small mb-1" htmlFor="activeFrom">Aktiv ab</label>
            <input
              type="date"
              className="form-control form-control-sm mb-2"
              id="activeFrom"
              value={activeFromFilter}
              onChange={(e) => setActiveFromFilter(e.target.value)}
            />
            <label className="form-label small mb-1" htmlFor="activeUntil">Aktiv bis</label>
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
