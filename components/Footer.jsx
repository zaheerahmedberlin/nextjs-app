// components/Footer.jsx – SEO: keyword-rich footer with internal links
export default function Footer() {
  const currentYear = new Date().getFullYear();

  const categories = [
    "Elektronik", "Smartphones", "Laptops & Computer", "TV & Audio",
    "Haushaltsgeräte", "Möbel & Wohnen", "Mode & Bekleidung", "Sport & Freizeit",
  ];

  return (
    <footer className="bg-light border-top mt-5 py-5" itemScope itemType="https://schema.org/WPFooter">
      <div className="container">
        <div className="row">

          {/* Brand + description */}
          <div className="col-12 col-md-4 mb-4">
            <h2 className="h5 text-price fw-bold">Preisgucken</h2>
            <p className="text-muted small">
              Ihr kostenloser <strong>Preisvergleich für Deutschland</strong>. Vergleichen Sie
              Preise von hunderten Online-Shops und finden Sie immer das günstigste Angebot –
              für Elektronik, Möbel, Mode und mehr.
            </p>
            <p className="text-muted small mb-0">
              🇩🇪 Preisvergleich Deutschland &nbsp;|&nbsp; 🇦🇹 Österreich &nbsp;|&nbsp; 🇨🇭 Schweiz
            </p>
          </div>

          {/* Category links – internal SEO links */}
          <div className="col-12 col-md-4 mb-4">
            <h3 className="h6 fw-bold">Kategorien</h3>
            <ul className="list-unstyled row">
              {categories.map((cat) => (
                <li key={cat} className="col-6">
                  <a href={`/kategorie/${cat.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                    className="text-decoration-none text-muted small">
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Info links */}
          <div className="col-6 col-md-2 mb-4">
            <h3 className="h6 fw-bold">Rechtliches</h3>
            <ul className="list-unstyled">
              <li><a href="/impressum" className="text-decoration-none text-muted small">Impressum</a></li>
              <li><a href="/datenschutz" className="text-decoration-none text-muted small">Datenschutzerklärung</a></li>
              <li><a href="/agb" className="text-decoration-none text-muted small">AGB</a></li>
              <li><a href="/cookie-einstellungen" className="text-decoration-none text-muted small">Cookie-Einstellungen</a></li>
            </ul>
          </div>

          <div className="col-6 col-md-2 mb-4">
            <h3 className="h6 fw-bold">Unternehmen</h3>
            <ul className="list-unstyled">
              <li><a href="/ueber-uns" className="text-decoration-none text-muted small">Über uns</a></li>
              <li><a href="/so-funktioniert-es" className="text-decoration-none text-muted small">So funktioniert's</a></li>
              <li><a href="/affiliate-programm" className="text-decoration-none text-muted small">Affiliate-Programm</a></li>
              <li><a href="/kontakt" className="text-decoration-none text-muted small">Kontakt</a></li>
            </ul>
          </div>
        </div>

        {/* Trust signals */}
        <div className="row border-top pt-3 mt-2 align-items-center">
          <div className="col-12 col-md-8 text-muted small">
            <p className="mb-1">
              * Alle Preise inkl. MwSt. Preise können sich seit der letzten Aktualisierung
              geändert haben. Bitte prüfen Sie den aktuellen Preis beim jeweiligen Händler.
            </p>
            <p className="mb-0">
              © {currentYear} Preisgucken – Alle Rechte vorbehalten. &nbsp;
              <a href="/sitemap.xml" className="text-muted">Sitemap</a>
            </p>
          </div>
          <div className="col-12 col-md-4 text-md-end mt-2 mt-md-0">
            <span className="badge bg-light text-muted border me-1">✓ SSL-verschlüsselt</span>
            <span className="badge bg-light text-muted border me-1">✓ Kostenlos</span>
            <span className="badge bg-light text-muted border">✓ Ohne Anmeldung</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
