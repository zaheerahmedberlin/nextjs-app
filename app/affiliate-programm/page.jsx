import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Affiliate-Programm – Preisgucken",
  description: "Listen Sie Ihre Produkte auf Preisgucken.de. Nur legal registrierte Händler aus Deutschland. Jetzt Partner werden.",
};

export default function AffiliateProgrammPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="fw-bold mb-2">Partner werden</h1>
        <p className="text-muted mb-5">
          Präsentieren Sie Ihre Produkte auf Preisgucken.de und erreichen Sie täglich tausende kaufbereite Verbraucher in Deutschland.
        </p>

        {/* Requirements */}
        <div className="mb-5">
          <h2 className="h5 fw-bold mb-3">Voraussetzungen für Händler</h2>
          <p className="text-muted small mb-3">
            Um die Qualität und Seriosität unserer Plattform zu gewährleisten, akzeptieren wir ausschließlich
            Händler, die folgende Kriterien erfüllen:
          </p>
          <ul className="list-unstyled">
            {[
              "Gewerbeanmeldung oder Eintrag im Handelsregister in Deutschland",
              "Gültige deutsche Umsatzsteuer-Identifikationsnummer (USt-IdNr.)",
              "Vollständiges Impressum gemäß § 5 TMG auf der Website",
              "Lieferung nach Deutschland",
              "Sichere Zahlungsmethoden und DSGVO-konforme Datenschutzerklärung",
              "Keine gefälschten oder irreführenden Produktangebote",
            ].map((item) => (
              <li key={item} className="mb-2 text-muted small">
                <span style={{ color: "#F5A623", fontWeight: 700, marginRight: 8 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* How to join */}
        <div className="mb-5">
          <h2 className="h5 fw-bold mb-3">So werden Sie Partner</h2>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="p-4 h-100" style={{ background: "#f8faff", borderRadius: 12 }}>
                <h3 className="h6 fw-bold mb-2">Option 1 — Über AWIN</h3>
                <p className="text-muted small mb-2">
                  Wenn Sie bereits Mitglied im AWIN-Netzwerk sind, können Sie uns direkt über AWIN als Publisher
                  einladen (Publisher-ID: 2988023).
                </p>
                <a
                  href="https://www.awin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-sm fw-bold"
                  style={{ background: "#1A3A6B", color: "#fff", borderRadius: 6 }}
                >
                  Zu AWIN →
                </a>
              </div>
            </div>
            <div className="col-md-6">
              <div className="p-4 h-100" style={{ background: "#f8faff", borderRadius: 12 }}>
                <h3 className="h6 fw-bold mb-2">Option 2 — Direkte Partnerschaft</h3>
                <p className="text-muted small mb-2">
                  Kontaktieren Sie uns direkt per E-Mail mit Ihren Unternehmensdaten und wir melden uns
                  innerhalb von 2 Werktagen bei Ihnen.
                </p>
                <a
                  href="mailto:b2b@preisgucken.de"
                  className="btn btn-sm fw-bold"
                  style={{ background: "#F5A623", color: "#fff", borderRadius: 6 }}
                >
                  b2b@preisgucken.de
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4" style={{ background: "#fff8ee", borderRadius: 12, borderLeft: "4px solid #F5A623" }}>
          <h2 className="h6 fw-bold mb-2">Ihre Vorteile als Partner</h2>
          <ul className="list-unstyled mb-0">
            {[
              "Zugang zu tausenden kaufbereiten Verbrauchern täglich",
              "Nur erfolgsbasierte Provision — kein Risiko",
              "Einfache Integration über Produktdatenfeed (CSV/XML)",
              "Transparente Auswertung über das AWIN-Dashboard",
            ].map((item) => (
              <li key={item} className="mb-1 text-muted small">
                <span style={{ color: "#F5A623", fontWeight: 700, marginRight: 8 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
