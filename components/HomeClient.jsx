// components/HomeClient.jsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import VendorStrip from "@/components/VendorStrip";
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
      name: "Wie aktuell sind die Preise?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Unsere Preise werden täglich automatisch aktualisiert. Da Preise sich kurzfristig ändern können, empfehlen wir, den aktuellen Preis vor dem Kauf noch einmal direkt beim Händler zu prüfen.",
      },
    },
    {
      "@type": "Question",
      name: "Kann ich benachrichtigt werden, wenn der Preis fällt?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja! Auf jeder Produktseite können Sie einen Preisalarm mit Ihrem Wunschpreis einrichten. Sobald der Preis auf oder unter Ihren Zielpreis fällt, informieren wir Sie automatisch per E-Mail.",
      },
    },
    {
      "@type": "Question",
      name: "Kann ich sehen, wie sich der Preis entwickelt hat?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Ja, zu jedem Produkt zeigen wir den Preisverlauf der letzten 30 Tage inklusive Tiefst-, Höchst- und aktuellem Preis – so erkennen Sie sofort, ob ein Angebot wirklich günstig ist.",
      },
    },
  ],
};

export default function HomeClient({ initialProducts = [], initialMaxPrice = 10000, initialCategories = [], initialTotalProducts = 0 }) {
  const searchParams = useSearchParams();
  const [products, setProducts]                         = useState(initialProducts);
  const [categories, setCategories]                     = useState(initialCategories);
  const [popularTerms, setPopularTerms]                 = useState(() => {
    // "Sonstiges" is a meaningless catch-all bucket, never a real "popular"
    // signal. "Unterwäsche" is a genuinely large, fully-browsable category
    // (~669 active products) but isn't a good homepage headline tag for a
    // general-audience price-comparison site — both excluded from this
    // specific front-page display only, not from search/browsing anywhere
    // else on the site.
    const EXCLUDED_FROM_POPULAR = new Set(["Sonstiges", "Unterwäsche"]);
    // Cap 2 tags per top-level parent category so raw import volume from
    // one vendor (e.g. Voghion's 24k+ fashion products) can't fill the
    // whole list — tags should reflect the site's actual category breadth
    // (Elektronik, Möbel, Balkonkraftwerke, ...), not just whichever single
    // vertical happens to have the most SKUs at any given moment.
    const MAX_PER_PARENT = 2;
    const leaves = initialCategories
      .flatMap((parent) =>
        (parent.children?.length > 0 ? parent.children : [parent])
          .map((c) => ({ ...c, parentName: parent.name }))
      )
      .filter((c) => !EXCLUDED_FROM_POPULAR.has(c.name))
      .sort((a, b) => b.productCount - a.productCount);

    const perParentCount = {};
    const capped = [];
    for (const c of leaves) {
      const used = perParentCount[c.parentName] ?? 0;
      if (used >= MAX_PER_PARENT) continue;
      perParentCount[c.parentName] = used + 1;
      capped.push(c);
      if (capped.length >= 6) break;
    }
    return capped.map((c) => c.name);
  });
  const [activeOffers, setActiveOffers]                 = useState([]);
  const [lowestPriceProducts, setLowestPriceProducts]   = useState([]);
  const [totalProducts, setTotalProducts]               = useState(initialTotalProducts);
  const [pageCount, setPageCount]                       = useState(1);
  const [lowestStartIndex, setLowestStartIndex]         = useState(0);
  const [isNavbarShrink, setIsNavbarShrink]             = useState(false);
  const [showAllProducts, setShowAllProducts]           = useState(false);
  const [newsletterToast, setNewsletterToast]           = useState("");
  const [elektronikProducts, setElektronikProducts]     = useState([]);
  const [gesundheitProducts, setGesundheitProducts]     = useState([]);
  const [moebelProducts, setMoebelProducts]             = useState([]);
  const [premiumProducts, setPremiumProducts]           = useState([]);
  const [selectedProduct, setSelectedProduct]           = useState(null);
  const [isLoading, setIsLoading]                       = useState(false);

  // Filters
  const [searchQuery, setSearchQuery]                   = useState(searchParams.get("q") ?? "");
  // Lazy initializer — runs once on mount only, same as searchQuery above.
  // Supports comma-separated slugs to match how the rest of the app already
  // builds category query strings (e.g. "sofas,betten").
  const [selectedCategories, setSelectedCategories]     = useState(() => {
    const cat = searchParams.get("category");
    return cat ? cat.split(",").map((s) => s.trim()).filter(Boolean) : [];
  });
  const [sortOption, setSortOption]                     = useState("relevance");
  const [maxPriceFilter, setMaxPriceFilter]             = useState(initialMaxPrice);
  const [defaultMaxPrice, setDefaultMaxPrice]           = useState(initialMaxPrice);
  const [currentPage, setCurrentPage]                   = useState(1);
  const [showOutOfStock, setShowOutOfStock]             = useState(false);
  const [showInactiveProducts, setShowInactiveProducts] = useState(false);

  // Skip the first products fetch — we already have server-rendered initial products
  const isFirstMount = useRef(true);

  const visibleLowestCount = 6;

  // ── Newsletter confirmation toast ──────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nl = params.get("newsletter");
    if (nl === "confirmed")         setNewsletterToast("confirmed");
    if (nl === "already-confirmed") setNewsletterToast("Du bist bereits angemeldet.");
    if (nl === "unsubscribed")      setNewsletterToast("Du wurdest erfolgreich abgemeldet.");
    if (nl === "unsubscribe-error") setNewsletterToast("Abmeldung fehlgeschlagen – bitte kontaktiere uns.");
    if (nl) window.history.replaceState({}, "", "/");
  }, []);

  // ── Init: fetch offers + featured category sections once ──────────
  useEffect(() => {
    // Featured category sections for homepage
    fetch("/api/products?category=elektronik&sort=priceAsc&limit=6&inStockOnly=true&minPrice=15&perVendorLimit=2")
      .then((r) => r.json())
      .then((data) => setElektronikProducts(data.products || []))
      .catch(() => {});

    fetch("/api/products?category=gesundheit&sort=priceAsc&limit=6&inStockOnly=true&perVendorLimit=2")
      .then((r) => r.json())
      .then((data) => setGesundheitProducts(data.products || []))
      .catch(() => {});

    fetch("/api/products?category=sitzen&sort=priceAsc&limit=6&inStockOnly=true&perVendorLimit=2")
      .then((r) => r.json())
      .then((data) => setMoebelProducts(data.products || []))
      .catch(() => {});

    fetch("/api/products?premiumOnly=true&sort=priceDesc&limit=6&inStockOnly=true&perVendorLimit=2")
      .then((r) => r.json())
      .then((data) => setPremiumProducts(data.products || []))
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
  // A single 150px threshold flips isNavbarShrink on every scroll event
  // that crosses it — since shrinking itself changes page layout (navbar
  // padding + the hero collapsing by up to 600px), a scroll position that
  // lands right near the boundary (trackpad momentum, slow wheel scroll)
  // can flip the state back and forth on consecutive events, visibly
  // blinking the hero/header search fields. A dead zone between the
  // collapse and expand thresholds gives it hysteresis so it can't flap.
  useEffect(() => {
    const handleScroll = () => {
      setIsNavbarShrink((prev) => {
        if (window.scrollY > 180) return true;
        if (window.scrollY < 120) return false;
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Products: debounced fetch on any filter change ─────────────
  const debounceRef = useRef(null);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // The server-rendered initial products are always the generic
      // unfiltered homepage view (getInitialData() doesn't read the
      // request's URL) — only safe to reuse as-is when nothing from the
      // URL pre-populated a filter on load (e.g. /?category=elektronik or
      // /?q=sofa). Otherwise still need the real first fetch, or the page
      // shows the unfiltered SSR data while claiming to be filtered.
      if (!searchQuery && selectedCategories.length === 0) return;
      // Fetch immediately, skipping the debounce below — that debounce
      // exists to avoid firing on every keystroke while typing a search
      // query, which doesn't apply here: the filter arrived pre-set from
      // the URL (e.g. a category page's "Alle X-Angebote durchsuchen"
      // link), so delaying it just shows the generic SSR view for ~400ms
      // before snapping to the correct one — a visible flash of unrelated
      // products the debounce was never meant to cause.
      loadProducts();
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(loadProducts, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, selectedCategories, maxPriceFilter, sortOption, currentPage,
      showOutOfStock, showInactiveProducts, showAllProducts]);

  const isDefaultView = !searchQuery && selectedCategories.length === 0 &&
    (maxPriceFilter === null || maxPriceFilter >= defaultMaxPrice) &&
    !showOutOfStock && !showInactiveProducts && !showAllProducts;

  async function loadProducts() {
    const params = new URLSearchParams({
      q:               searchQuery,
      sort:            isDefaultView ? "priceAsc" : sortOption,
      page:            currentPage,
      inStockOnly:     showOutOfStock ? "false" : "true",
      includeInactive: showInactiveProducts ? "true" : "false",
      ...(isDefaultView && { limit: 12 }),
      // Floor for "Günstigste Angebote heute" — excludes trivially-priced
      // novelty items (greeting cards, vouchers, etc.) that are technically
      // cheapest but aren't genuine comparison-shopping deals.
      ...(isDefaultView && { minPrice: 15 }),
      // Cap each vendor to 2 of their own cheapest qualifying products
      // *before* ranking overall — done server-side via a window function,
      // since a client-side cap after fetching a small raw batch breaks
      // down once one vendor's catalog is large enough to fill that batch
      // almost entirely (as Voghion's 24k+ products did).
      ...(isDefaultView && { perVendorLimit: 2 }),
    });
    if (selectedCategories.length > 0) params.set("category", selectedCategories.join(","));
    if (maxPriceFilter > 0 && maxPriceFilter < defaultMaxPrice) params.set("maxPrice", maxPriceFilter);


    setIsLoading(true);
    try {
      const res  = await fetch(`/api/products?${params}`);
      const data = await res.json();
      const displayed = data.products ?? [];
      setProducts(displayed);
      setTotalProducts(data.total ?? 0);
      setPageCount(data.pageCount ?? 1);
    } catch (err) {
      console.error("loadProducts error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  function resetPage() { setCurrentPage(1); setShowAllProducts(false); }

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
          className="position-fixed bottom-0 end-0 m-3 shadow-lg"
          style={{ zIndex: 9999, maxWidth: 340 }}
        >
          {newsletterToast === "confirmed" ? (
            <div className="card border-0" style={{ background: "#1A3A6B", color: "#fff", borderRadius: 12 }}>
              <div className="card-body p-3">
                <button className="btn-close btn-close-white float-end" onClick={() => setNewsletterToast("")} />
                <p className="fw-bold mb-1" style={{ fontSize: 15 }}>✅ E-Mail bestätigt!</p>
                <p className="mb-3" style={{ fontSize: 13, opacity: 0.85 }}>
                  Du erhältst ab jetzt unseren Newsletter. Kennst du jemanden der auch sparen will?
                </p>
                <div className="d-flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent("Hey! 👋\n\nIch spare Geld mit preisgucken.de – kostenloser Preisvergleich für deutsche Online-Shops.\n\nMeld dich für den Newsletter an:\n👉 https://www.preisgucken.de/#newsletter\n\nKostenlos & kein Spam!")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm fw-semibold flex-fill"
                    style={{ background: "#25D366", color: "#fff", borderRadius: 8, fontSize: 13 }}
                  >
                    WhatsApp teilen
                  </a>
                  <a
                    href={`mailto:?subject=Preise%20vergleichen%20%26%20sparen%20–%20preisgucken.de&body=${encodeURIComponent("Hey!\n\nIch spare Geld mit preisgucken.de – kostenloser Preisvergleich für deutsche Online-Shops.\n\nMeld dich für den Newsletter an:\nhttps://www.preisgucken.de/#newsletter\n\nKostenlos & kein Spam!")}`}
                    className="btn btn-sm fw-semibold flex-fill"
                    style={{ background: "rgba(255,255,255,0.15)", color: "#fff", borderRadius: 8, fontSize: 13 }}
                  >
                    Per E-Mail
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="alert mb-0"
              style={{ borderRadius: 10 }}
              role="alert"
            >
              {newsletterToast}
              <button className="btn-close ms-3 float-end" onClick={() => setNewsletterToast("")} />
            </div>
          )}
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
              {!isDefaultView && (
                <p className="text-muted small mb-0">
                  <strong>{totalProducts.toLocaleString("de-DE")}</strong> Produkte gefunden
                </p>
              )}
              <div className="ms-auto" style={{ display: isDefaultView ? "none" : undefined }}>
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

            {isDefaultView && (
              <div className="mb-3">
                <h2 className="h6 fw-bold text-muted mb-3">🔥 Günstigste Angebote heute</h2>
              </div>
            )}

            <ProductGrid products={products} onOpenProduct={openProduct} onBuy={handleBuy} formatPrice={formatPrice} isLoading={isLoading} />

            {isDefaultView && elektronikProducts.length > 0 && (
              <div className="mt-5">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h6 fw-bold mb-0">⚡ Top Elektronik-Deals</h2>
                  <button
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => { setSelectedCategories(["elektronik"]); resetPage(); }}
                  >
                    Alle Elektronik →
                  </button>
                </div>
                <ProductGrid products={elektronikProducts} onOpenProduct={openProduct} onBuy={handleBuy} formatPrice={formatPrice} isLoading={false} />
              </div>
            )}

            {isDefaultView && moebelProducts.length > 0 && (
              <div className="mt-5">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h6 fw-bold mb-0">🛋️ Möbel & Einrichtung</h2>
                  <button
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => { setSelectedCategories(["sitzen"]); resetPage(); }}
                  >
                    Alle Möbel →
                  </button>
                </div>
                <ProductGrid products={moebelProducts} onOpenProduct={openProduct} onBuy={handleBuy} formatPrice={formatPrice} isLoading={false} />
              </div>
            )}

            {isDefaultView && premiumProducts.length > 0 && (
              <div className="mt-5">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h6 fw-bold mb-0">💎 Premium Highlights</h2>
                </div>
                <ProductGrid products={premiumProducts} onOpenProduct={openProduct} onBuy={handleBuy} formatPrice={formatPrice} isLoading={false} />
              </div>
            )}

            {isDefaultView && gesundheitProducts.length > 0 && (
              <div className="mt-5">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h2 className="h6 fw-bold mb-0">💊 Gesundheit & Pflege</h2>
                  <button
                    className="btn btn-link btn-sm p-0 text-decoration-none"
                    onClick={() => { setSelectedCategories(["gesundheit"]); resetPage(); }}
                  >
                    Alle Gesundheit →
                  </button>
                </div>
                <ProductGrid products={gesundheitProducts} onOpenProduct={openProduct} onBuy={handleBuy} formatPrice={formatPrice} isLoading={false} />
              </div>
            )}

            {isDefaultView && !isLoading && (
              <div className="text-center my-5">
                {/* Category quick-links */}
                <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
                  {categories.filter(c => (c.children?.reduce((s,k)=>s+k.productCount,0)||c.productCount)>0).slice(0,8).map(cat => (
                    <button
                      key={cat.slug}
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setSelectedCategories([cat.slug]); resetPage(); setShowAllProducts(false); }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-primary px-4"
                  onClick={() => setShowAllProducts(true)}
                >
                  Alle Produkte anzeigen →
                </button>
              </div>
            )}

            {!isDefaultView && (
              <Pagination currentPage={currentPage} pageCount={pageCount} setCurrentPage={setCurrentPage} />
            )}

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
                    Preisgucken<sup style={{ fontSize: "0.6em" }}>™</sup> ist Ihr kostenloser <strong>Preisvergleich für Deutschland</strong>.
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
                  { q: "Wie aktuell sind die Preise?",    a: "Unsere Preise werden täglich automatisch aktualisiert. Da Preise sich kurzfristig ändern können, empfehlen wir, den aktuellen Preis vor dem Kauf noch einmal direkt beim Händler zu prüfen." },
                  { q: "Kann ich benachrichtigt werden, wenn der Preis fällt?", a: "Ja! Auf jeder Produktseite können Sie einen Preisalarm mit Ihrem Wunschpreis einrichten. Sobald der Preis auf oder unter Ihren Zielpreis fällt, informieren wir Sie automatisch per E-Mail." },
                  { q: "Kann ich sehen, wie sich der Preis entwickelt hat?", a: "Ja, zu jedem Produkt zeigen wir den Preisverlauf der letzten 30 Tage inklusive Tiefst-, Höchst- und aktuellem Preis – so erkennen Sie sofort, ob ein Angebot wirklich günstig ist." },
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
      <VendorStrip />

      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onBuy={handleBuy}
      />
    </>
  );
}
