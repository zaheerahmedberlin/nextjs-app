// app/page.jsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Sidebar from "@/components/Sidebar";
import ProductGrid from "@/components/ProductGrid";
import Pagination from "@/components/Pagination";
import LastSeen from "@/components/LastSeen";
import LowestPriceSection from "@/components/LowestPriceSection";
import OffersSection from "@/components/OffersSection";
import NewsletterSection from "@/components/NewsletterSection";
import DealAlertBanner from "@/components/DealAlertBanner";
import Footer from "@/components/Footer";
import ProductModal from "@/components/ProductModal";

// Resolve a category slug to its display name from the tree
function slugToName(tree, slug) {
  for (const parent of tree) {
    if (parent.slug === slug) return parent.name;
    for (const child of parent.children ?? []) {
      if (child.slug === slug) return child.name;
    }
  }
  return null;
}

export function formatPrice(value) {
  const n = parseFloat(value);
  if (isNaN(n)) return value;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
}

export function countdown(endDate) {
  const end = new Date(endDate);
  const diff = end - new Date();
  if (diff <= 0) return "Angebot beendet";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `Noch ${days}T ${hours}h`;
}

function buildItemListSchema(products) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Günstigste Produkte – Preisvergleich Deutschland",
    description: "Die besten Preise im Vergleich auf Preisgucken.de",
    numberOfItems: products.length,
    itemListElement: products.slice(0, 20).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Product",
        name: p.title,
        image: p.image || "https://www.preisgucken.de/placeholder.png",
        url: p.url,
        offers: {
          "@type": "Offer",
          price: p.price,
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
          priceValidUntil: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
          seller: { "@type": "Organization", name: p.vendor || "Händler" },
        },
      },
    })),
  };
}

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Startseite", item: "https://www.preisgucken.de" },
    { "@type": "ListItem", position: 2, name: "Preisvergleich", item: "https://www.preisgucken.de/preisvergleich" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Wie funktioniert Preisgucken?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Preisgucken sammelt täglich Preise von großen deutschen Online-Shops und zeigt Ihnen auf einen Blick, wo ein Produkt gerade am günstigsten ist. Einfach Produkt suchen, Preise vergleichen und direkt zum günstigsten Anbieter klicken – kostenlos und ohne Anmeldung.",
      },
    },
    {
      "@type": "Question",
      name: "Ist Preisgucken kostenlos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja, Preisgucken ist für Verbraucher vollständig kostenlos. Wir verdienen eine kleine Provision, wenn Sie über unsere Links einkaufen – für Sie entstehen dadurch keine Mehrkosten.",
      },
    },
    {
      "@type": "Question",
      name: "Welche Shops werden verglichen?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Wir vergleichen Preise von bekannten deutschen Online-Shops wie Amazon, Home24, XXXLutz, Westwing, Mirjan24 und MediaMarkt. Das Sortiment wird regelmäßig erweitert.",
      },
    },
    {
      "@type": "Question",
      name: "Wie aktuell sind die Preise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unsere Preise werden täglich automatisch aktualisiert. Da Preise sich kurzfristig ändern können, empfehlen wir, den aktuellen Preis vor dem Kauf noch einmal direkt beim Händler zu prüfen.",
      },
    },
  ],
};

export default function Home() {
  const [products, setProducts]                         = useState([]);
  const [categories, setCategories]                     = useState([]);
  const [popularTerms, setPopularTerms]                 = useState([]);
  const [activeOffers, setActiveOffers]                 = useState([]);
  const [lowestPriceProducts, setLowestPriceProducts]   = useState([]);
  const [totalProducts, setTotalProducts]               = useState(0);
  const [pageCount, setPageCount]                       = useState(1);
  const [lowestStartIndex, setLowestStartIndex]         = useState(0);
  const [isNavbarShrink, setIsNavbarShrink]             = useState(false);
  const [newsletterToast, setNewsletterToast]           = useState("");
  const [selectedProduct, setSelectedProduct]           = useState(null);

  // Filters
  const [searchQuery, setSearchQuery]                   = useState(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("q") ?? "" : ""
  );
  const [selectedCategories, setSelectedCategories]     = useState([]);
  const [sortOption, setSortOption]                     = useState("relevance");
  const [maxPriceFilter, setMaxPriceFilter]             = useState(null); // null = not yet initialised
  const [defaultMaxPrice, setDefaultMaxPrice]           = useState(0);
  const [currentPage, setCurrentPage]                   = useState(1);
  const [showOutOfStock, setShowOutOfStock]             = useState(false);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);

  const visibleLowestCount = 6;

  // ── Newsletter confirmation toast ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nl = params.get("newsletter");
    if (nl === "confirmed")         setNewsletterToast("✓ E-Mail bestätigt! Du erhältst ab jetzt unseren Newsletter.");
    if (nl === "already-confirmed") setNewsletterToast("Du bist bereits angemeldet.");
    if (nl) window.history.replaceState({}, "", "/");
  }, []);

  // ── Init: fetch max price + categories + offers once ──────────
  useEffect(() => {
    // Max price → initialises the slider and triggers the first product fetch
    fetch("/api/products/price-range", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const max = parseFloat(data.max) || 10000;
        const rounded = Math.ceil(max / 100) * 100;
        setDefaultMaxPrice(rounded);
        setMaxPriceFilter(rounded);
      })
      .catch(() => {
        setDefaultMaxPrice(10000);
        setMaxPriceFilter(10000);
      });

    // Categories from API — top 6 by product count become popular terms
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        const tree = Array.isArray(data) ? data : [];
        setCategories(tree);
        // Popular terms: leaf categories with most products
        const leaves = tree.flatMap((c) => c.children?.length > 0 ? c.children : [c]);
        setPopularTerms(leaves.sort((a, b) => b.productCount - a.productCount).slice(0, 6).map((c) => c.name));
      })
      .catch(() => {});

    // Offers from static file (optional)
    fetch("/offers.json")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const today = new Date();
        setActiveOffers(
          data.filter((o) => {
            const start = new Date(o.offerStart);
            const end   = new Date(o.offerEnd);
            return start <= today && end >= today && o.type !== "Black Friday";
          })
        );
      })
      .catch(() => {});
  }, []);

  // ── Scroll: shrink navbar ──────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => setIsNavbarShrink(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Products: debounced fetch on any filter change ─────────────
  // Gate on maxPriceFilter !== null so we don't fetch before init
  const debounceRef = useRef(null);
  useEffect(() => {
    if (maxPriceFilter === null) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadProducts, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedCategories, maxPriceFilter, sortOption, currentPage,
      showOutOfStock, showInactiveProducts]);

  async function loadProducts() {
    const params = new URLSearchParams({
      q:               searchQuery,
      sort:            sortOption,
      page:            currentPage,
      inStockOnly:     showOutOfStock ? "false" : "true",
      includeInactive: showInactiveProducts ? "true" : "false",
    });
    if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
    if (maxPriceFilter > 0 && maxPriceFilter < defaultMaxPrice) params.set("maxPrice", maxPriceFilter);


    try {
      const res  = await fetch(`/api/products?${params}`);
      const data = await res.json();
      setProducts(data.products ?? []);
      setTotalProducts(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
    } catch (err) {
      console.error("loadProducts error:", err);
    }
  }

  function resetPage() { setCurrentPage(1); }

  async function openProduct(product) {
    try {
      if (window.gtag) {
        window.gtag("event", "select_item", {
          item_list_id: "price_compare",
          items: [{ item_id: product.id, item_name: product.title, price: product.price }],
        });
      }
      let seen = JSON.parse(localStorage.getItem("lastSeenProducts") || "[]");
      seen = seen.filter((p) => p.id !== product.id);
      seen.unshift({ id: product.id, title: product.title, image: product.image, price: product.price, vendor: product.vendor, url: product.url });
      if (seen.length > 12) seen = seen.slice(0, 12);
      localStorage.setItem("lastSeenProducts", JSON.stringify(seen));

      // Show modal with price history chart
      setSelectedProduct(product);
    } catch (e) {
      console.error(e);
    }
  }

  function handleBuy(product) {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.id, vendor: product.vendor, url: product.url }),
    }).catch(() => {});
  }

  const visibleLowestProducts = lowestPriceProducts.slice(lowestStartIndex, lowestStartIndex + visibleLowestCount);
  const itemListSchema = useMemo(() => buildItemListSchema(lowestPriceProducts), [lowestPriceProducts]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Newsletter confirmation toast */}
      {newsletterToast && (
        <div
          className="position-fixed bottom-0 end-0 m-3 alert alert-success shadow"
          style={{ zIndex: 9999, minWidth: 300 }}
        >
          {newsletterToast}
          <button className="btn-close ms-3 float-end" onClick={() => setNewsletterToast("")} />
        </div>
      )}

      <Navbar
        isNavbarShrink={isNavbarShrink}
        searchQuery={searchQuery}
        setSearchQuery={(v) => { setSearchQuery(v); resetPage(); }}
        setCurrentPage={setCurrentPage}
      />

      <div style={{ maxHeight: isNavbarShrink ? "0" : "600px", overflow: "hidden", transition: "max-height 0.3s ease" }}>
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={(v) => { setSearchQuery(v); resetPage(); }}
          setCurrentPage={setCurrentPage}
          totalProducts={totalProducts}
          popularTerms={popularTerms}
        />
      </div>

      <nav aria-label="breadcrumb" className="container-fluid px-3 pt-2">
        <ol className="breadcrumb mb-0 small" itemScope itemType="https://schema.org/BreadcrumbList">
          <li className="breadcrumb-item" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a href="/" itemProp="item"><span itemProp="name">Startseite</span></a>
            <meta itemProp="position" content="1" />
          </li>
          <li className="breadcrumb-item active" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name">
              {selectedCategories.length === 1 ? (slugToName(categories, selectedCategories[0]) ?? selectedCategories[0]) : "Preisvergleich"}
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      <div className="container-fluid p-3">
        <div className="row">
          <Sidebar
            categories={categories}
            selectedCategories={selectedCategories}
            setSelectedCategories={(v) => { setSelectedCategories(v); resetPage(); }}
            maxPriceFilter={maxPriceFilter ?? defaultMaxPrice}
            setMaxPriceFilter={(v) => { setMaxPriceFilter(v); resetPage(); }}
            defaultMaxPrice={defaultMaxPrice}
            formatPrice={formatPrice}
            showOutOfStock={showOutOfStock}
            setShowOutOfStock={(v) => { setShowOutOfStock(v); resetPage(); }}
            showInactiveProducts={showInactiveProducts}
            setShowInactiveProducts={(v) => { setShowInactiveProducts(v); resetPage(); }}
          />

          <main className="col-12 col-md-9 col-lg-10" role="main">
            <h1 className="visually-hidden">
              Preisvergleich Deutschland – Günstige Preise für{" "}
              {selectedCategories.length > 0 ? selectedCategories.map((s) => slugToName(categories, s) ?? s).join(", ") : "alle Produkte"}
            </h1>

            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <p className="text-muted small mb-0">
                <strong>{totalProducts.toLocaleString("de-DE")}</strong> Produkte gefunden
              </p>
              <div className="ms-auto">
                <label htmlFor="sortSelect" className="visually-hidden">Sortierung</label>
                <select
                  id="sortSelect"
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); resetPage(); }}
                  className="form-select"
                  style={{ minWidth: 200 }}
                  aria-label="Produkte sortieren"
                >
                  <option value="relevance">Sortieren nach: Relevanz</option>
                  <option value="priceAsc">Preis: Niedrig → Hoch</option>
                  <option value="priceDesc">Preis: Hoch → Niedrig</option>
                </select>
              </div>
            </div>

            <DealAlertBanner
              searchQuery={searchQuery}
              categorySlug={selectedCategories[0] ?? null}
              maxPrice={maxPriceFilter !== defaultMaxPrice ? maxPriceFilter : null}
            />

            <ProductGrid products={products} onOpenProduct={openProduct} formatPrice={formatPrice} />

            <Pagination currentPage={currentPage} pageCount={pageCount} setCurrentPage={setCurrentPage} />

            <LastSeen onOpenProduct={openProduct} />

            <LowestPriceSection
              visibleLowestProducts={visibleLowestProducts}
              lowestStartIndex={lowestStartIndex}
              setLowestStartIndex={setLowestStartIndex}
              lowestPriceProductsLength={lowestPriceProducts.length}
              visibleLowestCount={visibleLowestCount}
              onOpenProduct={openProduct}
            />

            <OffersSection activeOffers={activeOffers} countdown={countdown} />

            {/* ── SEO editorial block ── */}
            <section className="mt-5 pt-4 border-top" aria-label="Über Preisgucken">
              <div className="row">
                <div className="col-12 col-md-4 mb-3">
                  <h2 className="h6 fw-bold">Preise vergleichen &amp; sparen</h2>
                  <p className="text-muted small">
                    Preisgucken ist Ihr kostenloser <strong>Preisvergleich für Deutschland</strong>.
                    Wir zeigen Ihnen tagesaktuelle Preise aus deutschen Online-Shops – damit Sie
                    immer den günstigsten Preis finden.
                  </p>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <h2 className="h6 fw-bold">Kategorien im Vergleich</h2>
                  <p className="text-muted small">
                    Von <a href="/kategorie/elektronik" className="text-muted">Elektronik</a> über{" "}
                    <a href="/kategorie/schlafen" className="text-muted">Möbel &amp; Schlafen</a> bis{" "}
                    <a href="/kategorie/sitzen" className="text-muted">Sitzen &amp; Liegen</a> –
                    vergleichen Sie Preise in allen Produktkategorien und sparen Sie beim
                    Online-Einkauf.
                  </p>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <h2 className="h6 fw-bold">Wie funktioniert der Preisvergleich?</h2>
                  <p className="text-muted small">
                    Einfach Produkt suchen, Preise vergleichen, zum günstigsten Anbieter
                    weiterklicken – fertig. Preisgucken ist kostenlos und ohne Anmeldung nutzbar.
                  </p>
                </div>
              </div>
            </section>

            {/* ── FAQ section (matches FAQPage schema above) ── */}
            <section className="mt-4 pt-4 border-top" aria-label="Häufige Fragen" itemScope itemType="https://schema.org/FAQPage">
              <h2 className="h5 fw-bold mb-3">Häufige Fragen zum Preisvergleich</h2>
              <div className="row g-3">
                {[
                  { q: "Wie funktioniert Preisgucken?",   a: "Preisgucken sammelt täglich Preise von großen deutschen Online-Shops und zeigt Ihnen auf einen Blick, wo ein Produkt gerade am günstigsten ist. Einfach Produkt suchen, Preise vergleichen und direkt zum günstigsten Anbieter klicken – kostenlos und ohne Anmeldung." },
                  { q: "Ist Preisgucken kostenlos?",      a: "Ja, Preisgucken ist für Verbraucher vollständig kostenlos. Wir verdienen eine kleine Provision, wenn Sie über unsere Links einkaufen – für Sie entstehen dadurch keine Mehrkosten." },
                  { q: "Welche Shops werden verglichen?", a: "Wir vergleichen Preise von bekannten deutschen Online-Shops wie Amazon, Home24, XXXLutz, Westwing, Mirjan24 und MediaMarkt. Das Sortiment wird regelmäßig erweitert." },
                  { q: "Wie aktuell sind die Preise?",    a: "Unsere Preise werden täglich automatisch aktualisiert. Da Preise sich kurzfristig ändern können, empfehlen wir, den aktuellen Preis vor dem Kauf noch einmal direkt beim Händler zu prüfen." },
                ].map(({ q, a }) => (
                  <div key={q} className="col-12 col-md-6" itemScope itemType="https://schema.org/Question" itemProp="mainEntity">
                    <h3 className="h6 fw-semibold mb-1" itemProp="name">{q}</h3>
                    <div itemScope itemType="https://schema.org/Answer" itemProp="acceptedAnswer">
                      <p className="text-muted small mb-0" itemProp="text">{a}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>

      <NewsletterSection />
      <Footer />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onBuy={handleBuy}
      />
    </>
  );
}
