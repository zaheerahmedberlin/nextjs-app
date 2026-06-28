// app/page.jsx – Main page with full SEO: structured data, semantic HTML, meta
"use client";

import { useState, useEffect, useMemo } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Sidebar from "@/components/Sidebar";
import ProductGrid from "@/components/ProductGrid";
import Pagination from "@/components/Pagination";
import LastSeen from "@/components/LastSeen";
import LowestPriceSection from "@/components/LowestPriceSection";
import OffersSection from "@/components/OffersSection";
import Footer from "@/components/Footer";

export function formatPrice(value) {
  if (typeof value !== "number") return value;
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}

export function countdown(endDate) {
  const end = new Date(endDate);
  const diff = end - new Date();
  if (diff <= 0) return "Angebot beendet";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `Noch ${days}T ${hours}h`;
}

// ── ItemList schema for Google (product carousel eligibility) ──
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

// ── BreadcrumbList schema ──────────────────────────────────────
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Startseite", item: "https://www.preisgucken.de" },
    { "@type": "ListItem", position: 2, name: "Preisvergleich", item: "https://www.preisgucken.de/vergleich" },
  ],
};

export default function Home() {
  const [products, setProducts]               = useState([]);
  const [categories, setCategories]           = useState([]);
  const [offers, setOffers]                   = useState([]);
  const [activeOffers, setActiveOffers]       = useState([]);
  const [, setBlackFridayOffers]              = useState([]);
  const [searchQuery, setSearchQuery]         = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortOption, setSortOption]           = useState("relevance");
  const [maxPriceFilter, setMaxPriceFilter]   = useState(0);
  const [defaultMaxPrice, setDefaultMaxPrice] = useState(0);
  const [currentPage, setCurrentPage]         = useState(1);
  const [lowestPriceProducts, setLowestPriceProducts] = useState([]);
  const [lowestStartIndex, setLowestStartIndex] = useState(0);
  const [isNavbarShrink, setIsNavbarShrink]   = useState(false);

  const perPage = 24;
  const visibleLowestCount = 6;

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadOffers();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsNavbarShrink(window.scrollY > 150);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  async function loadProducts() {
    try {
      const res = await fetch("/products.json");
      if (!res.ok) throw new Error("products.json not found");
      const data = await res.json();
      setProducts(data);
      const prices = data.map((p) => p.price || 0);
      const max = Math.max(...prices, 1000);
      setDefaultMaxPrice(max);
      setMaxPriceFilter(max);
      const grouped = {};
      data.forEach((p) => {
        if (!grouped[p.category] || p.price < grouped[p.category].price) grouped[p.category] = p;
      });
      setLowestPriceProducts(Object.values(grouped));
    } catch (err) {
      console.error(err);
      setProducts([]);
    }
  }

  async function loadOffers() {
    try {
      const res = await fetch("/offers.json");
      if (!res.ok) throw new Error("offers.json not found");
      const data = await res.json();
      setOffers(data);
      const today = new Date();
      setActiveOffers(
        data.filter((o) => {
          const start = new Date(o.offerStart);
          const end = new Date(o.offerEnd);
          return start <= today && end >= today && (!o.type || o.type !== "Black Friday");
        })
      );
      setBlackFridayOffers(data.filter((o) => o.type === "Black Friday"));
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCategories() {
    try {
      const res = await fetch("/categories.txt");
      if (!res.ok) throw new Error("categories.txt not found");
      const txt = await res.text();
      setCategories(txt.split(/\r?\n+/).map((s) => s.trim()).filter(Boolean));
    } catch (err) {
      console.error(err);
    }
  }

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    let filtered = products.filter((p) => {
      const matchesSearch = p.title?.toLowerCase().includes(q);
      const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
      const matchesPrice = p.price <= maxPriceFilter;
      return matchesSearch && matchesCategory && matchesPrice;
    });
    if (sortOption === "priceAsc") filtered = [...filtered].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (sortOption === "priceDesc") filtered = [...filtered].sort((a, b) => (b.price || 0) - (a.price || 0));
    return filtered;
  }, [products, searchQuery, selectedCategories, maxPriceFilter, sortOption]);

  const pageCount = Math.ceil(filteredProducts.length / perPage);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredProducts.slice(start, start + perPage);
  }, [filteredProducts, currentPage]);

  const visibleLowestProducts = lowestPriceProducts.slice(
    lowestStartIndex, lowestStartIndex + visibleLowestCount
  );

  function openProduct(product) {
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
      window.open(product.url, "_blank");
    } catch (e) {
      console.error(e);
    }
  }

  // Build structured data from live product data
  const itemListSchema = useMemo(() => buildItemListSchema(lowestPriceProducts), [lowestPriceProducts]);

  return (
    <>
      {/* ── Dynamic structured data (injected client-side) ── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <Navbar
        isNavbarShrink={isNavbarShrink}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setCurrentPage={setCurrentPage}
      />

      {!isNavbarShrink && (
        <HeroSection
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setCurrentPage={setCurrentPage}
          totalProducts={products.length}
        />
      )}

      {/* ── SEO: Breadcrumb visible to users & crawlers ── */}
      <nav aria-label="breadcrumb" className="container-fluid px-3 pt-2">
        <ol className="breadcrumb mb-0 small" itemScope itemType="https://schema.org/BreadcrumbList">
          <li className="breadcrumb-item" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <a href="/" itemProp="item"><span itemProp="name">Startseite</span></a>
            <meta itemProp="position" content="1" />
          </li>
          <li className="breadcrumb-item active" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name">
              {selectedCategories.length === 1 ? selectedCategories[0] : "Preisvergleich"}
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
            setSelectedCategories={setSelectedCategories}
            maxPriceFilter={maxPriceFilter}
            setMaxPriceFilter={setMaxPriceFilter}
            defaultMaxPrice={defaultMaxPrice}
            formatPrice={formatPrice}
          />

          {/* ── Semantic main landmark for accessibility & SEO ── */}
          <main className="col-12 col-md-9 col-lg-10" role="main">

            {/* ── SEO: H1 with keyword, shown only once ── */}
            <h1 className="visually-hidden">
              Preisvergleich Deutschland – Günstige Preise für{" "}
              {selectedCategories.length > 0 ? selectedCategories.join(", ") : "alle Produkte"}
            </h1>

            {/* Sort + result count */}
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <p className="text-muted small mb-0">
                <strong>{filteredProducts.length.toLocaleString("de-DE")}</strong> Produkte gefunden
              </p>
              <div className="ms-auto">
                <label htmlFor="sortSelect" className="visually-hidden">Sortierung</label>
                <select
                  id="sortSelect"
                  value={sortOption}
                  onChange={(e) => { setSortOption(e.target.value); setCurrentPage(1); }}
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

            <ProductGrid
              products={paginatedProducts}
              onOpenProduct={openProduct}
              formatPrice={formatPrice}
            />

            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              setCurrentPage={setCurrentPage}
            />

            <LastSeen formatPrice={formatPrice} onOpenProduct={openProduct} />

            <LowestPriceSection
              visibleLowestProducts={visibleLowestProducts}
              lowestStartIndex={lowestStartIndex}
              setLowestStartIndex={setLowestStartIndex}
              lowestPriceProductsLength={lowestPriceProducts.length}
              visibleLowestCount={visibleLowestCount}
              formatPrice={formatPrice}
              onOpenProduct={openProduct}
            />

            <OffersSection
              activeOffers={activeOffers}
              formatPrice={formatPrice}
              countdown={countdown}
            />

            {/* ── SEO: Static keyword-rich text block for crawlers ── */}
            <section className="mt-5 pt-4 border-top" aria-label="Über Preisgucken">
              <div className="row">
                <div className="col-12 col-md-4 mb-3">
                  <h2 className="h6 fw-bold">🔍 Preise vergleichen & sparen</h2>
                  <p className="text-muted small">
                    Preisgucken ist Ihr kostenloser Preisvergleich für Deutschland. Wir zeigen
                    Ihnen tagesaktuelle Preise von hunderten Online-Shops – damit Sie immer den
                    günstigsten Preis finden.
                  </p>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <h2 className="h6 fw-bold">🛒 Alle Kategorien im Vergleich</h2>
                  <p className="text-muted small">
                    Von Elektronik über Möbel bis Mode – vergleichen Sie Preise in allen
                    Produktkategorien. Sparen Sie beim Online-Einkauf in Deutschland, Österreich
                    und der Schweiz.
                  </p>
                </div>
                <div className="col-12 col-md-4 mb-3">
                  <h2 className="h6 fw-bold">💡 Wie funktioniert der Preisvergleich?</h2>
                  <p className="text-muted small">
                    Einfach Produkt suchen, Preise vergleichen, zum günstigsten Anbieter
                    weiterklicken – fertig. Preisgucken ist kostenlos und ohne Anmeldung nutzbar.
                  </p>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}
