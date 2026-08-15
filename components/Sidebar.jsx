"use client";
import { useState } from "react";

// Renders one category row and recurses into its children, to any depth —
// e.g. Mode & Accessories (depth 0) > Damenmode (depth 1) > Damenpullover
// (depth 2). Deeper levels get progressively indented and a lighter
// background, matching the look the old hardcoded 2-level version had for
// its single child tier.
function CategoryNode({ node, depth, expanded, toggleExpand, selectedCategories, toggleCategory }) {
  if (node.productCount === 0) return null; // hide empty categories

  const isOpen = expanded[node.slug] === true; // default collapsed
  const isSelected = selectedCategories.includes(node.slug);
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
          cursor: hasChildren ? "pointer" : "default",
          userSelect: "none",
          paddingLeft: `${0.75 + depth * 0.75}rem`,
          background: depth > 0 ? "var(--pg-blue-light)" : undefined,
        }}
        onClick={() => hasChildren && toggleExpand(node.slug)}
      >
        <input
          className="form-check-input mt-0 flex-shrink-0"
          type="checkbox"
          id={`cat-${node.slug}`}
          checked={isSelected}
          onChange={() => toggleCategory(node.slug)}
          onClick={(e) => e.stopPropagation()}
        />
        <label
          className={`form-check-label small flex-grow-1 mb-0${depth === 0 ? " fw-semibold" : ""}`}
          // For parent rows, the label expands/collapses instead of
          // selecting — it's the only part of the row with real width, so
          // it's a far bigger, easier target than the tiny arrow icon. No
          // htmlFor means no native browser label→checkbox click, and no
          // onClick means the click bubbles up to the row's own onClick
          // (toggleExpand) instead of being stopped here. Checkbox stays
          // the one dedicated way to select a category either way.
          htmlFor={hasChildren ? undefined : `cat-${node.slug}`}
          style={{ cursor: "pointer" }}
          onClick={hasChildren ? undefined : (e) => e.stopPropagation()}
        >
          {node.name}
          <span className="text-muted fw-normal ms-1">({node.productCount})</span>
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
              toggleCategory={toggleCategory}
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
  formatPrice,
  showOutOfStock,
  setShowOutOfStock,
  showInactiveProducts,
  setShowInactiveProducts,
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

  // categories is now a tree: [{id, slug, name, children: [...]}] — children
  // can themselves have children, to any depth (e.g. Mode & Accessories >
  // Damenmode > Damenpullover), so rendering below recurses rather than
  // assuming exactly one level of nesting.
  const isTree = categories.length > 0 && "children" in categories[0];

  return (
    <aside className="w-100">

      {/* ── Categories ── */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Kategorien</div>
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
                  toggleCategory={toggleCategory}
                />
              ))}
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

        </div>
      </div>

    </aside>
  );
}
