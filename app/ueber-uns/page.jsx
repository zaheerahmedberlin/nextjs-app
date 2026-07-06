import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Über uns – Preisgucken",
  description: "Erfahren Sie mehr über Preisgucken.de – Ihre kostenlose Preissuchmaschine aus Deutschland.",
};

export default function UeberUnsPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="fw-bold mb-4">Über uns</h1>

        <section className="mb-5">
          <h2 className="h5 fw-bold">Was ist Preisgucken?</h2>
          <p className="text-muted">
            Preisgucken.de ist eine unabhängige, kostenlose Preissuchmaschine aus Deutschland.
            Wir vergleichen täglich aktuelle Preise aus deutschen Online-Shops – damit Sie
            immer das günstigste Angebot finden, ohne stundenlang zu suchen.
          </p>
          <p className="text-muted mb-0">
            Das Portal ist komplett kostenlos, ohne Registrierung nutzbar und werbefinanziert
            durch Affiliate-Provisionen bei ausgewählten Händlern.
          </p>
        </section>

        <section className="mb-5">
          <h2 className="h5 fw-bold">Unsere Mission</h2>
          <p className="text-muted mb-0">
            Wir glauben: Jeder sollte den besten Preis finden können – schnell, einfach und
            transparent. Preisgucken ist ein Berliner Projekt mit dem Ziel, deutschen Verbrauchern
            echte Preisklarheit zu geben.
          </p>
        </section>

        <div className="row g-4 mb-5">
          <div className="col-6 col-md-3 text-center">
            <div className="display-6 fw-bold" style={{ color: "var(--pg-blue)" }}>7.700+</div>
            <div className="small text-muted">Produkte</div>
          </div>
          <div className="col-6 col-md-3 text-center">
            <div className="display-6 fw-bold" style={{ color: "var(--pg-blue)" }}>7</div>
            <div className="small text-muted">Händler</div>
          </div>
          <div className="col-6 col-md-3 text-center">
            <div className="display-6 fw-bold" style={{ color: "var(--pg-blue)" }}>10+</div>
            <div className="small text-muted">Kategorien</div>
          </div>
          <div className="col-6 col-md-3 text-center">
            <div className="display-6 fw-bold" style={{ color: "var(--pg-blue)" }}>0 €</div>
            <div className="small text-muted">Für Nutzer</div>
          </div>
        </div>

        <section className="mb-5">
          <h2 className="h5 fw-bold">Wie finanzieren wir uns?</h2>
          <p className="text-muted mb-0">
            Wenn Sie über einen Link auf Preisgucken.de einkaufen, erhalten wir ggf. eine kleine
            Provision vom Händler – für Sie entstehen dabei keine Mehrkosten. Diese Einnahmen
            ermöglichen uns, den Service kostenlos und unabhängig anzubieten.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Kontakt</h2>
          <p className="text-muted mb-0">
            Fragen, Anregungen oder Kooperationsanfragen:{" "}
            <a href="mailto:b2b@preisgucken.de">b2b@preisgucken.de</a>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
