import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Kontakt – Preisgucken",
  description: "Nehmen Sie Kontakt mit Preisgucken.de auf.",
};

export default function KontaktPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 600 }}>
        <h1 className="fw-bold mb-2">Kontakt</h1>
        <p className="text-muted mb-5">
          Fragen, Fehler, Kooperationsanfragen oder Händler-Partnerschaft?
          Schreiben Sie uns – wir antworten in der Regel innerhalb von 1–2 Werktagen.
        </p>

        <div className="card border-0 shadow-sm p-4 mb-4">
          <h2 className="h6 fw-bold mb-3">E-Mail</h2>
          <p className="mb-0">
            <a href="mailto:b2b@preisgucken.de" className="fw-bold" style={{ color: "var(--pg-blue)" }}>
              b2b@preisgucken.de
            </a>
          </p>
        </div>

        <div className="card border-0 shadow-sm p-4 mb-4">
          <h2 className="h6 fw-bold mb-3">Händler-Partnerschaft</h2>
          <p className="small text-muted mb-0">
            Sie möchten Ihre Produkte auf Preisgucken.de listen? Senden Sie uns eine E-Mail
            mit Ihrem Produktkatalog oder einer Übersicht Ihres Sortiments. Wir melden uns
            innerhalb von 48 Stunden.
          </p>
        </div>

        <div className="card border-0 shadow-sm p-4">
          <h2 className="h6 fw-bold mb-3">Fehler melden</h2>
          <p className="small text-muted mb-0">
            Falscher Preis, nicht verfügbares Produkt, technischer Fehler? Bitte senden Sie
            uns die Produkt-URL und eine kurze Beschreibung.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
