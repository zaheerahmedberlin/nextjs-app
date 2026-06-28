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
        <a className="navbar-brand d-flex align-items-center" href="#">
          {/* In Vue: src="/preis-gucken-logo.png" works as-is.
              In Next.js, put images in the /public folder and use the same path. */}
          <img src="/preis-gucken-logo.png" alt="Preis Gucken Logo" className="me-2 logo-img" />
          <span className="fw-bold text-primary fs-4 brand-text"></span>
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
              <a className="nav-link" href="#">
                <i className="bi bi-plugin custom-icon"></i>
                <br />
                Elektro
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="#">
                <i className="bi bi-balloon custom-icon"></i>
                <br />
                Baby World
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="#">
                <i className="bi bi-arrow-through-heart-fill custom-icon"></i>
                <br />
                Hochzeit
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="#">
                <i className="bi bi-incognito custom-icon"></i>
                <br />
                Mode &amp; Accessories
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="#">
                <i className="bi bi-person-wheelchair custom-icon"></i>
                <br />
                Hilfsmittel für behinderte
              </a>
            </li>
            <li className="nav-item nav-center">
              <a className="nav-link" href="#">
                <i className="bi bi-car-front custom-icon"></i>
                <br />
                Auto
              </a>
            </li>
          </ul>

          {/* Search bar — visible only when navbar is shrunk (user scrolled down) */}
          {/* Vue: v-show="isNavbarShrink"
              React: conditional rendering with && */}
          {isNavbarShrink && (
            <div className="d-flex header-search align-items-center">
              <input
                className="form-control me-2"
                type="search"
                placeholder="Schnellsuche"
                value={searchQuery}
                // In Vue: v-model binds two ways automatically.
                // In React: we need onChange to update state manually.
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
          )}
        </div>
      </div>
    </nav>
  );
}
