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

export default function Navbar({ isNavbarShrink, searchQuery, setSearchQuery, setCurrentPage }) {

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

        {/* Mobile toggle button */}
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

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            <li className="nav-item nav-center">
              <a className="nav-link" href="/kategorie/elektronik">
                <i className="bi bi-plugin custom-icon"></i><br />Elektro
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="/kategorie/baby-world">
                <i className="bi bi-balloon custom-icon"></i><br />Baby World
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="/kategorie/hochzeit">
                <i className="bi bi-arrow-through-heart-fill custom-icon"></i><br />Hochzeit
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="/kategorie/mode">
                <i className="bi bi-incognito custom-icon"></i><br />Mode &amp; Accessories
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="/kategorie/hilfsmittel">
                <i className="bi bi-person-wheelchair custom-icon"></i><br />Hilfsmittel für behinderte
              </a>
            </li>
          </ul>

          <div
            className="d-flex header-search align-items-center"
            style={{ visibility: isNavbarShrink ? "visible" : "hidden", opacity: isNavbarShrink ? 1 : 0, transition: "opacity 0.2s" }}
          >
            <input
              className="form-control me-2"
              type="search"
              placeholder="Produkt suchen…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => setCurrentPage(1)}
            >
              <i className="bi bi-search"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
