"use client";
// Vendor-filter pills + product grid for the category page, as a client
// component so the server-rendered /kategorie/[slug] page never has to read
// searchParams (even just to check if it's unset) permanently opts a
// Next.js App Router page out of static/ISR caching, which was the root
// cause of ~460k pages sitting stuck in Google's "Discovered - currently
// not indexed" queue (Google throttles crawling once it sees every request
// forces a slow, uncached SSR DB round-trip). Filtering by vendor now
// re-fetches from the already-Redis-cached /api/products route client-side
// instead, so the base category page stays static/ISR-cacheable no matter
// how this feature is used.
import { useState } from "react";
import ProductImage from "@/components/ProductImage";

const fmtPrice = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

export default function CategoryProductGrid({ slug, categoryName, initialProducts, vendorCounts, genderFilters = [] }) {
  const [products, setProducts] = useState(initialProducts);
  const [selectedVendor, setSelectedVendor] = useState(null);
  // null = "Alle" (the page's own slug); otherwise one of genderFilters'
  // own slugs (e.g. "herrenjacken"). A gender option is just a real
  // category slug that /api/products already resolves correctly on its
  // own (same recursive + category_links expansion the page itself uses),
  // so selecting one simply swaps which slug is requested as `category` --
  // no new backend support needed, same as how vendor filtering already
  // reuses this one endpoint.
  const [selectedGender, setSelectedGender] = useState(null);
  const [loading, setLoading] = useState(false);

  async function applyFilters({ vendor = selectedVendor, gender = selectedGender } = {}) {
    setSelectedVendor(vendor);
    setSelectedGender(gender);
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: gender || slug, sort: "priceAsc", limit: "24" });
      if (vendor) params.set("vendor", vendor);
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      setProducts(data.products || []);
      // Reflects the filter in the URL for shareability/back-button support
      // without a full navigation/reload — the canonical tag still always
      // points at the unfiltered page, so this never creates a competing
      // indexable URL.
      const url = new URL(window.location.href);
      if (vendor) url.searchParams.set("vendor", vendor); else url.searchParams.delete("vendor");
      if (gender) url.searchParams.set("gender", gender); else url.searchParams.delete("gender");
      window.history.replaceState({}, "", url);
    } catch {
      // Keep the previously shown products rather than clearing the grid on a failed fetch.
    } finally {
      setLoading(false);
    }
  }

  const selectVendor = (vendorName) => {
    if (vendorName === selectedVendor) return;
    applyFilters({ vendor: vendorName });
  };
  const selectGender = (genderSlug) => {
    if (genderSlug === selectedGender) return;
    applyFilters({ gender: genderSlug });
  };

  const selectedGenderLabel = genderFilters.find((g) => g.slug === selectedGender)?.label;

  return (
    <>
      {genderFilters.length > 0 && (
        <div className="container pt-3 pb-1">
          <p className="small text-muted mb-2 fw-semibold">Geschlecht:</p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectGender(null)}
              className={`btn btn-sm ${selectedGender ? "btn-outline-secondary" : "btn-secondary"}`}
            >
              Alle
            </button>
            {genderFilters.map((g) => (
              <button
                type="button"
                key={g.slug}
                onClick={() => selectGender(g.slug)}
                className={`btn btn-sm ${selectedGender === g.slug ? "btn-secondary" : "btn-outline-secondary"}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {vendorCounts.length > 1 && (
        <div className="container pt-3 pb-1">
          <p className="small text-muted mb-2 fw-semibold">Marken:</p>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => selectVendor(null)}
              className={`btn btn-sm ${selectedVendor ? "btn-outline-secondary" : "btn-secondary"}`}
            >
              Alle
            </button>
            {vendorCounts.map((v) => (
              <button
                type="button"
                key={v.name}
                onClick={() => selectVendor(v.name)}
                className={`btn btn-sm ${selectedVendor === v.name ? "btn-secondary" : "btn-outline-secondary"}`}
              >
                {v.name}
                <span className={selectedVendor === v.name ? "ms-1" : "ms-1 text-muted"}>({v.cnt})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="container py-3" style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.15s" }}>
        {products.length > 0 ? (
          <>
            <div className="row g-3 mb-4">
              {products.map((p, i) => (
                <article key={p.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
                  <div className="card h-100 shadow-sm">
                    <ProductImage
                      src={p.image}
                      alt={`${p.title} – günstig kaufen`}
                      height={150}
                      priority={i < 3}
                    />
                    <div className="card-body p-2">
                      <h3 className="h6 text-truncate mb-1" title={p.title}>{p.title}</h3>
                      {p.vendor && <p className="small text-muted mb-1">{p.vendor}</p>}
                      <p className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
                        {fmtPrice(p.price)}
                      </p>
                      <a
                        href={`/produkt/${p.id}`}
                        className="btn btn-sm btn-outline-secondary w-100"
                      >
                        Zum Angebot →
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <p className="text-muted text-center small">
              Zeige die günstigsten {products.length} {categoryName}-Angebote.{" "}
              <a href={`/?category=${slug}`}>Alle {categoryName}-Angebote durchsuchen →</a>
            </p>
          </>
        ) : (
          <p className="text-muted py-5 text-center">
            {selectedVendor ? (
              <>
                Keine {categoryName}-Produkte{selectedGenderLabel ? ` (${selectedGenderLabel})` : ""} von {selectedVendor} verfügbar.{" "}
                <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => applyFilters({ vendor: null })}>
                  Filter zurücksetzen
                </button>
              </>
            ) : selectedGenderLabel ? (
              <>
                Keine {categoryName}-Produkte für {selectedGenderLabel} verfügbar.{" "}
                <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => applyFilters({ gender: null })}>
                  Filter zurücksetzen
                </button>
              </>
            ) : (
              <>
                Aktuell keine Produkte in dieser Kategorie verfügbar.{" "}
                <a href="/">Zum Preisvergleich</a>
              </>
            )}
          </p>
        )}
      </main>
    </>
  );
}
