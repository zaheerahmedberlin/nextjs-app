"use client";
import { useState } from "react";

// Renders one category row and recurses into its children, to any depth —
// e.g. Mode & Accessories (depth 0) > Damenmode (depth 1) > Damenpullover
// (depth 2). Deeper levels get progressively indented and a lighter
// background, matching the look the old hardcoded 2-level version had for
// its single child tier.
//
// Plain click-to-navigate instead of checkboxes (changed 2026-08-21 —
// checkboxes implied "combine multiple categories," which was confusing
// most users even though a few CTAs elsewhere in the app do use that
// multi-category URL format). Clicking a category name now selects ONLY
// that one category, matching the familiar Amazon/idealo pattern; the
// expand arrow is a separate click target so browsing into subcategories
// doesn't also change the active filter.
function CategoryNode({ node, depth, expanded, toggleExpand, selectedCategories, selectCategory }) {
  if (node.productCount === 0) return null; // hide empty categories

  const isOpen = expanded[node.slug] === true; // default collapsed
  const isSelected = selectedCategories.length === 1 && selectedCategories[0] === node.slug;
  const visibleChildren = node.children?.filter((c) => c.productCount > 0) ?? [];
  // "Has children" means "has children worth expanding into" — a
  // category whose child rows all currently have 0 products (several
  // predate this session's vendor imports and were never populated)
  // must not get an arrow that expands into nothing.
  const hasChildren = visibleChildren.length > 0;

  return (
    <li className={depth === 0 ? "border-bottom" : ""}>
      <div
        className="d-flex align-items-center px-3 py-2 gap-2 sidebar-cat-row"
        style={{
          paddingLeft: `${0.75 + depth * 0.75}rem`,
          background: isSelected ? "var(--pg-blue)" : depth > 0 ? "var(--pg-blue-light)" : undefined,
        }}
      >
        <button
          type="button"
          aria-pressed={isSelected}
          className={`btn btn-link p-0 text-start text-decoration-none small flex-grow-1${depth === 0 ? " fw-semibold" : ""}`}
          style={{ color: isSelected ? "#ffffff" : "inherit" }}
          onClick={() => selectCategory(node.slug)}
        >
          {node.name}
          <span className={isSelected ? "ms-1" : "text-muted fw-normal ms-1"} style={isSelected ? { opacity: 0.85 } : undefined}>
            ({node.productCount})
          </span>
        </button>
        {hasChildren && (
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Unterkategorien einklappen" : "Unterkategorien anzeigen"}
            className={`btn btn-link p-2 ${isSelected ? "" : "text-muted"}`}
            style={{
              fontSize: 10,
              lineHeight: 1,
              color: isSelected ? "#ffffff" : undefined,
              transition: "transform 0.2s",
              transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand(node.slug);
            }}
          >
            ▼
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <ul className="list-unstyled mb-0">
          {visibleChildren.map((child) => (
            <CategoryNode
              key={child.slug}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedCategories={selectedCategories}
              selectCategory={selectCategory}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function Sidebar({
  categories,
  selectedCategories,
  setSelectedCategories,
  maxPriceFilter,
  setMaxPriceFilter,
  defaultMaxPrice,
  absoluteMaxPrice,
  formatPrice,
  showOutOfStock,
  setShowOutOfStock,
  showInactiveProducts,
  setShowInactiveProducts,
}) {
  const price = maxPriceFilter || 0;
  // Track which parent groups are expanded
  const [expanded, setExpanded] = useState({});

  // The slider itself is capped at defaultMaxPrice (the 95th percentile) so
  // dragging it stays usable for typical prices. But the number box next to
  // it must NOT share that cap — otherwise anyone shopping in a category
  // with genuinely pricier items (printers, servers, ...) can't type e.g.
  // "5000" to filter for them; it'd just get silently clamped back down to
  // ~500. Text input's ceiling is the real current highest price in the
  // DB (fetched server-side, not a guessed constant), so it always tracks
  // the actual catalog instead of going stale as prices change.
  const maxTypeablePrice = absoluteMaxPrice || defaultMaxPrice;
  function handlePriceChange(v) {
    const clamped = Math.min(Math.max(0, Number(v) || 0), maxTypeablePrice);
    setMaxPriceFilter(clamped);
  }

  // Single-select: clicking a category replaces the whole selection rather
  // than toggling it into a combined multi-category filter — checkboxes
  // implying "combine categories" was confusing most users, even though a
  // few CTAs elsewhere in the app still build multi-category URLs
  // directly. Clicking the already-active category again clears it, same
  // as the explicit "Alle Kategorien" link below.
  function selectCategory(slug) {
    setSelectedCategories((prev) => (prev.length === 1 && prev[0] === slug ? [] : [slug]));
  }

  function toggleExpand(slug) {
    setExpanded((prev) => ({ ...prev, [slug]: !prev[slug] }));
  }

  // categories is now a tree: [{id, slug, name, children: [...]}] — children
  // can themselves have children, to any depth (e.g. Mode & Accessories >
  // Damenmode > Damenpullover), so rendering below recurses rather than
  // assuming exactly one level of nesting.
  const isTree = categories.length > 0 && "children" in categories[0];

  return (
    <aside className="w-100">

      {/* ── Categories ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold d-flex justify-content-between align-items-center">
          Kategorien
          {selectedCategories.length > 0 && (
            <button
              type="button"
              className="btn btn-link p-0 small fw-normal text-decoration-underline"
              onClick={() => setSelectedCategories([])}
            >
              Alle Kategorien
            </button>
          )}
        </div>
        <div className="card-body overflow-auto p-0" style={{ maxHeight: "45vh" }}>
          {isTree ? (
            <ul className="list-unstyled mb-0">
              {categories.map((node) => (
                <CategoryNode
                  key={node.slug}
                  node={node}
                  depth={0}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  selectedCategories={selectedCategories}
                  selectCategory={selectCategory}
                />
              ))}
            </ul>
          ) : (
            // Fallback: flat list (old format)
            <div className="p-2">
              {categories.map((cat) => {
                const slug = cat.slug || cat;
                const isSelected = selectedCategories.length === 1 && selectedCategories[0] === slug;
                return (
                  <button
                    key={slug}
                    type="button"
                    aria-pressed={isSelected}
                    className="btn btn-link p-0 d-block text-start text-decoration-none small py-1"
                    style={{
                      color: isSelected ? "var(--pg-blue)" : undefined,
                      fontWeight: isSelected ? 600 : undefined,
                    }}
                    onClick={() => selectCategory(slug)}
                  >
                    {cat.name || cat}
                  </button>
                );
              })}
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
            <span className="text-muted small">bis {formatPrice(defaultMaxPrice)} (höher? Zahl eingeben)</span>
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
              max={maxTypeablePrice}
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

        </div>
      </div>

    </aside>
  );
}
