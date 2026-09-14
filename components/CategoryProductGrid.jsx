"use client";
// Vendor-filter pills + product grid for the category page, as a client
// component so the server-rendered /kategorie/[slug] page never has to read
// searchParams — reading searchParams at all (even just to check if it's
// unset) permanently opts a Next.js App Router page out of static/ISR
// caching, which was the root cause of ~460k pages stuck in Google's
// "Discovered - currently not indexed" queue (Google throttles crawling
// once it sees every request forces a slow, uncached SSR DB round-trip).
// Filtering by vendor now re-fetches from the already-Redis-cached
// /api/products route client-side instead, so the base category page stays
// static/ISR-cacheable no matter how this feature is used.
//
// "Load more" pagination added after the page shipped with a hard cap of
// 24 products and no way to see anything past that — a category with tens
// of thousands of products (e.g. Handwerkzeug: 73,134) was only ever
// browsable via its first 24 cheapest items, with no next page, no
// scroll-load, nothing. Reuses the same /api/products route (already
// supports page/limit) rather than a new endpoint.
import { useState } from "react";
import ProductImage from "@/components/ProductImage";

const PAGE_SIZE = 24;
const fmtPrice = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

export default function CategoryProductGrid({ slug, categoryName, initialProducts, vendorCounts, totalCount }) {
  const [products, setProducts] = useState(initialProducts);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [page, setPage] = useState(1);
  // Total for the *current* filter — starts at the server-computed
  // unfiltered totalCount, but a vendor filter narrows it, so this is
  // re-set from the API response's own `total` whenever the filter changes.
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  async function fetchPage({ vendor, pageNum }) {
    const params = new URLSearchParams({ category: slug, sort: "priceAsc", limit: String(PAGE_SIZE), page: String(pageNum) });
    if (vendor) params.set("vendor", vendor);
    const res = await fetch(`/api/products?${params.toString()}`);
    return res.json();
  }

  async function selectVendor(vendorName) {
    if (vendorName === selectedVendor) return;
    setSelectedVendor(vendorName);
    setLoading(true);
    try {
      const data = await fetchPage({ vendor: vendorName, pageNum: 1 });
      setProducts(data.products || []);
      setTotal(data.total ?? 0);
      setPage(1);
      // Reflects the filter in the URL for shareability/back-button support
      // without a full navigation/reload — the canonical tag still always
      // points at the unfiltered page, so this never creates a competing
      // indexable URL.
      const url = new URL(window.location.href);
      if (vendorName) url.searchParams.set("vendor", vendorName);
      else url.searchParams.delete("vendor");
      window.history.replaceState({}, "", url);
    } catch {
      // Keep the previously shown products rather than clearing the grid on a failed fetch.
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const data = await fetchPage({ vendor: selectedVendor, pageNum: nextPage });
      setProducts((prev) => [...prev, ...(data.products || [])]);
      setTotal(data.total ?? total);
      setPage(nextPage);
    } catch {
      // Leave the grid as-is on a failed fetch — the button just stays put to retry.
    } finally {
      setLoadingMore(false);
    }
  }

  const hasMore = products.length < total;

  return (
    <>
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

            <div className="text-center">
              <p className="text-muted small mb-3">
                Zeige {products.length.toLocaleString("de-DE")} von {total.toLocaleString("de-DE")} {categoryName}-Angeboten.
              </p>
              {hasMore && (
                <button
                  type="button"
                  className="btn btn-brand px-4"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Lädt…" : "Weitere Angebote laden"}
                </button>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted py-5 text-center">
            {selectedVendor ? (
              <>
                Keine {categoryName}-Produkte von {selectedVendor} verfügbar.{" "}
                <button type="button" className="btn btn-link p-0 align-baseline" onClick={() => selectVendor(null)}>
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
