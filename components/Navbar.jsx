// ============================================================
// components/Navbar.jsx
//
// In Vue, everything lived in one file. In React/Next.js, it's
// common to split into smaller components for clarity and reuse.
//
// Props replace Vue's props: {} — they are passed from the parent
// like <Navbar isNavbarShrink={true} />.
// ============================================================
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// isNavbarShrink defaults to true so pages other than the homepage
// (which explicitly controls it for the scroll-shrink effect) get a
// visible, working search bar in the header instead of a hidden one.
export default function Navbar({ isNavbarShrink = true, searchQuery, setSearchQuery, setCurrentPage }) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState("");

  // Standalone pages (category pages, impressum, etc.) don't pass
  // search state down — fall back to local state and navigate to the
  // homepage search results on submit instead of calling setCurrentPage.
  const query = setSearchQuery ? searchQuery : localQuery;
  const updateQuery = setSearchQuery || setLocalQuery;
  const runSearch = () => {
    if (setCurrentPage) {
      setCurrentPage(1);
    } else {
      router.push(`/?q=${encodeURIComponent(query || "")}`);
    }
  };

  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  return (
    <nav
      className={`navbar navbar-expand-lg navbar-light bg-white shadow-sm sticky-top transition-all${
        isNavbarShrink ? " navbar-shrink" : ""
      }`}
    >
      {/* In Vue: :class="{ 'navbar-shrink': isNavbarShrink }"
          In React: template literals to conditionally add a class */}

      <div className="container-fluid px-3">
        {/* Brand / Logo */}
        <a className="navbar-brand d-flex align-items-center" href="/">
          <img src="/preisgucken_logo.svg" alt="Preisgucken.de Logo" className="me-2 logo-img" style={{ height: "80px", width: "auto" }} />
        </a>

        {/* Mobile toggle button — only shown once the collapsed search form
            is actually visible (isNavbarShrink). On the homepage before
            scrolling, the form stays hidden (the hero has its own visible
            search bar), so showing the toggler there would open an empty
            panel with nothing in it. */}
        {isNavbarShrink && (
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
        )}

        <div className="collapse navbar-collapse" id="navbarNav">
          <form
            className="d-flex header-search align-items-center ms-auto"
            style={{ visibility: isNavbarShrink ? "visible" : "hidden", opacity: isNavbarShrink ? 1 : 0, transition: "opacity 0.2s" }}
            onSubmit={(e) => { e.preventDefault(); runSearch(); }}
          >
            <input
              className="form-control me-2"
              type="search"
              placeholder="Produkt suchen…"
              value={query}
              onChange={(e) => updateQuery(e.target.value)}
            />
            <button
              className="btn btn-outline-primary"
              type="submit"
            >
              <i className="bi bi-search"></i>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
