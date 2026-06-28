// components/HeroSection.jsx – SEO: keyword-rich headings, product count
"use client";

export default function HeroSection({ searchQuery, setSearchQuery, setCurrentPage, totalProducts }) {
  return (
    <section className="hero-section text-center py-5" aria-label="Preisvergleich Suche">
      <div className="container">
        {/* H1 visible to users – primary keyword for German market */}
        <h1 className="display-5 fw-bold mb-2 text-dark">
          Preisvergleich Deutschland
        </h1>
        <p className="text-muted mb-1 fs-5">
          Günstige Preise finden – einfach, schnell, kostenlos
        </p>
        {totalProducts > 0 && (
          <p className="text-muted small mb-4">
            Aktuell <strong>{totalProducts.toLocaleString("de-DE")}</strong> Produkte im Vergleich
          </p>
        )}
        <div className="d-flex justify-content-center" style={{ maxWidth: 600, margin: "0 auto" }}>
          {/* aria-label helps Google understand the search function */}
          <label htmlFor="heroSearch" className="visually-hidden">Produkt suchen</label>
          <input
            id="heroSearch"
            className="form-control me-2"
            type="search"
            placeholder="Produkt suchen, z. B. iPhone 15, Samsung TV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setCurrentPage(1)}
            aria-label="Produktsuche"
            autoComplete="off"
          />
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setCurrentPage(1)}
            aria-label="Suchen"
          >
            <i className="bi bi-search" aria-hidden="true"></i> Suchen
          </button>
        </div>

        {/* Popular search terms – internal linking opportunity & keyword signals */}
        <div className="mt-3">
          <span className="text-muted small me-2">Beliebt:</span>
          {["Laptop", "Smartphone", "Fernseher", "Kopfhörer", "Kaffeemaschine"].map((term) => (
            <button
              key={term}
              className="btn btn-sm btn-outline-secondary me-1 mb-1"
              onClick={() => { setSearchQuery(term); setCurrentPage(1); }}
            >
              {term}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
