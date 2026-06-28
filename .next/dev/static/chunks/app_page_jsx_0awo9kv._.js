(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/app/page.jsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "countdown",
    ()=>countdown,
    "default",
    ()=>Home,
    "formatPrice",
    ()=>formatPrice
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
(()=>{
    const e = new Error("Cannot find module '@/components/Navbar'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/HeroSection'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/Sidebar'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/ProductGrid'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/Pagination'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/LastSeen'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/LowestPriceSection'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/OffersSection'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
(()=>{
    const e = new Error("Cannot find module '@/components/Footer'");
    e.code = 'MODULE_NOT_FOUND';
    throw e;
})();
// ============================================================
// app/page.jsx  –  The main page (replaces App.vue in Vue)
//
// In Next.js (App Router):
//   • This file = the "/" route automatically.
//   • "use client" is needed because we use useState, useEffect,
//     event handlers, and localStorage — all browser-only features.
//     Without it, Next.js would try to render this on the server.
// ============================================================
"use client";
;
;
;
;
;
;
;
;
;
;
;
function formatPrice(value) {
    if (typeof value !== "number") return value;
    return new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR"
    }).format(value);
}
function countdown(endDate) {
    const end = new Date(endDate);
    const diff = end - new Date();
    if (diff <= 0) return "Angebot beendet";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60) % 24);
    return `Noch ${days}T ${hours}h`;
}
function Home() {
    // ── State (replaces Vue's `data()`) ──────────────────────
    const [products, setProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [categories, setCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [offers, setOffers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [activeOffers, setActiveOffers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // blackFridayOffers kept for future use (currently commented out in original)
    const [, setBlackFridayOffers] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [selectedCategories, setSelectedCategories] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [sortOption, setSortOption] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("relevance");
    const [maxPriceFilter, setMaxPriceFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [defaultMaxPrice, setDefaultMaxPrice] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [currentPage, setCurrentPage] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(1);
    const [lowestPriceProducts, setLowestPriceProducts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [lowestStartIndex, setLowestStartIndex] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(0);
    const [isNavbarShrink, setIsNavbarShrink] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const perPage = 24;
    const visibleLowestCount = 6;
    // ── Data fetching (replaces Vue's `mounted()` + methods) ──
    // useEffect with [] runs once when the component first renders,
    // just like Vue's mounted() lifecycle hook.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Home.useEffect": ()=>{
            loadProducts();
            loadCategories();
            loadOffers();
        }
    }["Home.useEffect"], []); // ← empty array means "run only once on mount"
    // Scroll listener — also set up once on mount
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "Home.useEffect": ()=>{
            const handleScroll = {
                "Home.useEffect.handleScroll": ()=>setIsNavbarShrink(window.scrollY > 150)
            }["Home.useEffect.handleScroll"];
            window.addEventListener("scroll", handleScroll);
            // The return function is Vue's `beforeUnmount()` equivalent:
            // it cleans up the listener when the component is removed.
            return ({
                "Home.useEffect": ()=>window.removeEventListener("scroll", handleScroll)
            })["Home.useEffect"];
        }
    }["Home.useEffect"], []);
    async function loadProducts() {
        try {
            const res = await fetch("/products.json");
            if (!res.ok) throw new Error("products.json not found");
            const data = await res.json();
            setProducts(data);
            const prices = data.map((p)=>p.price || 0);
            const max = Math.max(...prices, 1000);
            setDefaultMaxPrice(max);
            setMaxPriceFilter(max);
            // Compute the cheapest product per category
            const grouped = {};
            data.forEach((p)=>{
                if (!grouped[p.category] || p.price < grouped[p.category].price) {
                    grouped[p.category] = p;
                }
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
            setActiveOffers(data.filter((o)=>{
                const start = new Date(o.offerStart);
                const end = new Date(o.offerEnd);
                return start <= today && end >= today && (!o.type || o.type !== "Black Friday");
            }));
            setBlackFridayOffers(data.filter((o)=>o.type === "Black Friday"));
        } catch (err) {
            console.error(err);
            setOffers([]);
        }
    }
    async function loadCategories() {
        try {
            const res = await fetch("/categories.txt");
            if (!res.ok) throw new Error("categories.txt not found");
            const txt = await res.text();
            setCategories(txt.split(/\r?\n+/).map((s)=>s.trim()).filter(Boolean));
        } catch (err) {
            console.error(err);
            setCategories([]);
        }
    }
    // ── Computed values (replaces Vue's `computed:`) ──────────
    // In React we use `useMemo` for values derived from state.
    // useMemo recalculates only when the listed dependencies change.
    const filteredProducts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Home.useMemo[filteredProducts]": ()=>{
            const q = searchQuery.toLowerCase();
            let filtered = products.filter({
                "Home.useMemo[filteredProducts].filtered": (p)=>{
                    const matchesSearch = p.title.toLowerCase().includes(q);
                    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category);
                    const matchesPrice = p.price <= maxPriceFilter;
                    return matchesSearch && matchesCategory && matchesPrice;
                }
            }["Home.useMemo[filteredProducts].filtered"]);
            if (sortOption === "priceAsc") {
                filtered = [
                    ...filtered
                ].sort({
                    "Home.useMemo[filteredProducts]": (a, b)=>(a.price || 0) - (b.price || 0)
                }["Home.useMemo[filteredProducts]"]);
            } else if (sortOption === "priceDesc") {
                filtered = [
                    ...filtered
                ].sort({
                    "Home.useMemo[filteredProducts]": (a, b)=>(b.price || 0) - (a.price || 0)
                }["Home.useMemo[filteredProducts]"]);
            }
            return filtered;
        }
    }["Home.useMemo[filteredProducts]"], [
        products,
        searchQuery,
        selectedCategories,
        maxPriceFilter,
        sortOption
    ]);
    const pageCount = Math.ceil(filteredProducts.length / perPage);
    const paginatedProducts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "Home.useMemo[paginatedProducts]": ()=>{
            const start = (currentPage - 1) * perPage;
            return filteredProducts.slice(start, start + perPage);
        }
    }["Home.useMemo[paginatedProducts]"], [
        filteredProducts,
        currentPage
    ]);
    const visibleLowestProducts = lowestPriceProducts.slice(lowestStartIndex, lowestStartIndex + visibleLowestCount);
    // ── Actions ───────────────────────────────────────────────
    function openProduct(product) {
        try {
            if (window.gtag) {
                window.gtag("event", "select_item", {
                    item_list_id: "price_compare",
                    items: [
                        {
                            item_id: product.id,
                            item_name: product.title,
                            price: product.price
                        }
                    ]
                });
            }
            let seen = JSON.parse(localStorage.getItem("lastSeenProducts") || "[]");
            seen = seen.filter((p)=>p.id !== product.id);
            seen.unshift({
                id: product.id,
                title: product.title,
                image: product.image,
                price: product.price,
                vendor: product.vendor,
                url: product.url
            });
            if (seen.length > 12) seen = seen.slice(0, 12);
            localStorage.setItem("lastSeenProducts", JSON.stringify(seen));
            window.open(product.url, "_blank");
        } catch (e) {
            console.error("error saving last seen", e);
        }
    }
    // ── Render ────────────────────────────────────────────────
    // In Vue you have <template>. In React/Next.js, you return JSX.
    // JSX looks like HTML but lives inside JavaScript.
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxs"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(Navbar, {
                isNavbarShrink: isNavbarShrink,
                searchQuery: searchQuery,
                setSearchQuery: setSearchQuery,
                setCurrentPage: setCurrentPage
            }),
            !isNavbarShrink && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(HeroSection, {
                searchQuery: searchQuery,
                setSearchQuery: setSearchQuery,
                setCurrentPage: setCurrentPage
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])("div", {
                className: "container-fluid p-3",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxs"])("div", {
                    className: "row",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(Sidebar, {
                            categories: categories,
                            selectedCategories: selectedCategories,
                            setSelectedCategories: setSelectedCategories,
                            maxPriceFilter: maxPriceFilter,
                            setMaxPriceFilter: setMaxPriceFilter,
                            defaultMaxPrice: defaultMaxPrice,
                            formatPrice: formatPrice
                        }),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxs"])("main", {
                            className: "col-12 col-md-9 col-lg-10",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])("div", {
                                    className: "d-flex flex-wrap align-items-center gap-2 mb-3",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])("div", {
                                        className: "ms-auto",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxs"])("select", {
                                            value: sortOption,
                                            onChange: (e)=>{
                                                setSortOption(e.target.value);
                                                setCurrentPage(1);
                                            },
                                            className: "form-select",
                                            style: {
                                                minWidth: 200
                                            },
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])("option", {
                                                    value: "relevance",
                                                    children: "Sortieren nach: Relevanz"
                                                }),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])("option", {
                                                    value: "priceAsc",
                                                    children: "Preis: Niedrig → Hoch"
                                                }),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])("option", {
                                                    value: "priceDesc",
                                                    children: "Preis: Hoch → Niedrig"
                                                })
                                            ]
                                        })
                                    })
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(ProductGrid, {
                                    products: paginatedProducts,
                                    onOpenProduct: openProduct,
                                    formatPrice: formatPrice
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(Pagination, {
                                    currentPage: currentPage,
                                    pageCount: pageCount,
                                    setCurrentPage: setCurrentPage
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(LastSeen, {
                                    formatPrice: formatPrice,
                                    onOpenProduct: openProduct
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(LowestPriceSection, {
                                    visibleLowestProducts: visibleLowestProducts,
                                    lowestStartIndex: lowestStartIndex,
                                    setLowestStartIndex: setLowestStartIndex,
                                    lowestPriceProductsLength: lowestPriceProducts.length,
                                    visibleLowestCount: visibleLowestCount,
                                    formatPrice: formatPrice,
                                    onOpenProduct: openProduct
                                }),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(OffersSection, {
                                    activeOffers: activeOffers,
                                    formatPrice: formatPrice,
                                    countdown: countdown
                                })
                            ]
                        })
                    ]
                })
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsx"])(Footer, {})
        ]
    });
}
}),
]);

//# sourceMappingURL=app_page_jsx_0awo9kv._.js.map