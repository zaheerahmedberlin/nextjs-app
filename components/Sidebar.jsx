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
}) {
  // Toggle a category on/off in the selected list
  // Vue: v-model on a checkbox array handles this automatically.
  // React: we do it manually in the onChange handler.
  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  return (
    <aside className="col-12 col-md-3 col-lg-2 mb-3 mb-md-0">
      {/* Categories filter */}
      <div className="card shadow-sm mb-3">
        <div className="card-header fw-bold">Kategorien</div>
        <div className="card-body overflow-auto" style={{ maxHeight: "55vh" }}>
          {/* Vue: v-for="cat in categories"
              React: .map() over the array */}
          {categories.map((cat) => (
            <div key={cat} className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id={cat}
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleCategory(cat)}
              />
              <label className="form-check-label" htmlFor={cat}>
                {/* In Vue: `for` is fine. In React JSX: use `htmlFor` */}
                {cat}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Price range filter */}
      <div className="card shadow-sm">
        <div className="card-header fw-bold">Preisfilter</div>
        <div className="card-body">
          <label htmlFor="priceRange" className="form-label d-flex justify-content-between">
            <span>Bis: {formatPrice(maxPriceFilter)}</span>
            <span className="text-muted small">(max: {formatPrice(defaultMaxPrice)})</span>
          </label>
          <input
            type="range"
            className="form-range"
            id="priceRange"
            value={maxPriceFilter}
            onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
            // Vue: v-model.number → Number() converts the string value from the input
            min={0}
            max={defaultMaxPrice}
            step={1}
          />
        </div>
      </div>
    </aside>
  );
}
