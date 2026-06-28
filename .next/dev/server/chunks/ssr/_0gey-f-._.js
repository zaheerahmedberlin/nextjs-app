module.exports = [
"[project]/app/layout.jsx [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// app/layout.jsx – SEO-optimised shell for German price comparison market
__turbopack_context__.s([
    "default",
    ()=>RootLayout,
    "metadata",
    ()=>metadata
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
;
;
const BASE_URL = "https://www.preisgucken.de";
const metadata = {
    metadataBase: new URL(BASE_URL),
    // ── Primary meta ──────────────────────────────────────────
    title: {
        default: "Preisgucken – Preisvergleich Deutschland | Beste Preise finden",
        template: "%s | Preisgucken – Preisvergleich"
    },
    description: "Preisvergleich für über 400 Millionen Produkte in Deutschland. Finden Sie die günstigsten Preise für Elektronik, Möbel, Mode und mehr. Kostenlos & aktuell.",
    // ── Keywords (German market focused) ──────────────────────
    keywords: [
        "Preisvergleich",
        "Preisvergleich Deutschland",
        "günstigste Preise",
        "Preise vergleichen",
        "billiger kaufen",
        "Schnäppchen",
        "Angebote heute",
        "Preissuchmaschine",
        "Produktvergleich",
        "online einkaufen günstig",
        "Elektronik Preisvergleich",
        "Preis gucken"
    ],
    // ── Canonical & alternates ─────────────────────────────────
    alternates: {
        canonical: BASE_URL,
        languages: {
            "de-DE": BASE_URL
        }
    },
    // ── Open Graph (Facebook, WhatsApp, LinkedIn shares) ──────
    openGraph: {
        type: "website",
        locale: "de_DE",
        url: BASE_URL,
        siteName: "Preisgucken",
        title: "Preisgucken – Preisvergleich Deutschland",
        description: "Vergleiche Preise von Millionen Produkten. Spare Geld beim Online-Shopping in Deutschland.",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
                alt: "Preisgucken – Preisvergleich Deutschland"
            }
        ]
    },
    // ── Twitter / X card ──────────────────────────────────────
    twitter: {
        card: "summary_large_image",
        title: "Preisgucken – Preisvergleich Deutschland",
        description: "Finde die besten Preise für Millionen Produkte in Deutschland.",
        images: [
            "/og-image.png"
        ]
    },
    // ── Robots ────────────────────────────────────────────────
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1
        }
    },
    // ── Verification (add your real tokens) ───────────────────
    verification: {
        google: "YOUR_GOOGLE_SEARCH_CONSOLE_TOKEN"
    }
};
function RootLayout({ children }) {
    // ── Organisation structured data (shown in Google Knowledge Panel) ──
    const orgSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Preisgucken",
        url: BASE_URL,
        logo: `${BASE_URL}/preis-gucken-logo.png`,
        description: "Deutschlands smarte Preissuchmaschine – Preise vergleichen und sparen.",
        contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "b2b@preisgucken.de",
            availableLanguage: "German"
        },
        sameAs: [
            "https://www.linkedin.com/company/preisgucken"
        ]
    };
    // ── WebSite schema (enables Google Sitelinks search box) ──
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Preisgucken",
        url: BASE_URL,
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${BASE_URL}/suche?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("html", {
        lang: "de",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("head", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                        type: "application/ld+json",
                        dangerouslySetInnerHTML: {
                            __html: JSON.stringify(orgSchema)
                        }
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                        type: "application/ld+json",
                        dangerouslySetInnerHTML: {
                            __html: JSON.stringify(websiteSchema)
                        }
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 127,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "preconnect",
                        href: "https://cdn.jsdelivr.net"
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 133,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "stylesheet",
                        href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 136,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "stylesheet",
                        href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 141,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "icon",
                        href: "/favicon.ico"
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 147,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("link", {
                        rel: "apple-touch-icon",
                        href: "/apple-touch-icon.png"
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 148,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/layout.jsx",
                lineNumber: 121,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("body", {
                children: [
                    children,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("script", {
                        src: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js",
                        async: true
                    }, void 0, false, {
                        fileName: "[project]/app/layout.jsx",
                        lineNumber: 152,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/layout.jsx",
                lineNumber: 150,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/layout.jsx",
        lineNumber: 120,
        columnNumber: 5
    }, this);
}
}),
"[project]/app/layout.jsx [app-rsc] (ecmascript, Next.js Server Component)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.jsx [app-rsc] (ecmascript)"));
}),
"[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)", ((__turbopack_context__, module, exports) => {
"use strict";

module.exports = __turbopack_context__.r("[project]/node_modules/next/dist/server/route-modules/app-page/module.compiled.js [app-rsc] (ecmascript)").vendored['react-rsc'].ReactJsxDevRuntime;
}),
];

//# sourceMappingURL=_0gey-f-._.js.map