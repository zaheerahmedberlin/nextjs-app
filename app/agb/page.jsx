import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AGB – Preisgucken",
  description: "Allgemeine Geschäftsbedingungen von Preisgucken.de.",
  robots: { index: true, follow: false },
};

export default function AgbPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="fw-bold mb-2">Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p className="text-muted small mb-5">Stand: Juli 2025</p>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 1 Geltungsbereich</h2>
          <p className="small text-muted">
            Diese Allgemeinen Geschäftsbedingungen gelten für die Nutzung des Preisvergleichsportals
            Preisgucken.de (nachfolgend „Portal"), betrieben von Zaheer Ahmed (Einzelunternehmen),
            Berlin. Das Portal ist ein kostenloser Informationsdienst und stellt selbst keine Produkte
            zum Verkauf bereit.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 2 Leistungsbeschreibung</h2>
          <p className="small text-muted">
            Preisgucken.de ist eine Preissuchmaschine, die Produktpreise aus öffentlich zugänglichen
            Quellen automatisch aggregiert und vergleicht. Das Portal vermittelt ausschließlich
            Informationen und leitet Nutzer zu den jeweiligen Händlern weiter. Kaufverträge kommen
            ausschließlich zwischen dem Nutzer und dem jeweiligen Händler zustande.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 3 Preisangaben</h2>
          <p className="small text-muted">
            Alle Preisangaben auf Preisgucken.de sind Bruttopreise inkl. der gesetzlichen
            Mehrwertsteuer, jedoch ohne etwaige Versandkosten. Preise können sich seit der
            letzten Aktualisierung geändert haben. Maßgeblich ist stets der Preis, der zum
            Zeitpunkt des Kaufs auf der Website des jeweiligen Händlers angezeigt wird.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 4 Affiliate-Hinweis</h2>
          <p className="small text-muted">
            Dieses Portal enthält Affiliate-Links zu externen Händlern. Bei einem Kauf über
            diese Links können wir eine Provision erhalten, ohne dass für den Nutzer Mehrkosten
            entstehen. Diese Provision dient der Finanzierung des kostenlosen Informationsangebots.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 5 Haftungsausschluss</h2>
          <p className="small text-muted">
            Wir übernehmen keine Haftung für die Richtigkeit, Vollständigkeit oder Aktualität der
            angezeigten Preise und Produktinformationen. Eine Haftung für Schäden, die durch die
            Nutzung des Portals entstehen, ist – soweit gesetzlich zulässig – ausgeschlossen.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 6 Verfügbarkeit</h2>
          <p className="small text-muted">
            Wir bemühen uns um eine hohe Verfügbarkeit des Portals, können diese jedoch nicht
            garantieren. Wartungsarbeiten, technische Störungen oder höhere Gewalt können zu
            vorübergehenden Ausfällen führen.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 7 Anwendbares Recht</h2>
          <p className="small text-muted">
            Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist Berlin.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 8 Änderungen der AGB</h2>
          <p className="small text-muted">
            Wir behalten uns vor, diese AGB jederzeit zu ändern. Die aktuelle Version ist stets
            unter preisgucken.de/agb abrufbar.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">§ 9 Kontakt</h2>
          <p className="small text-muted mb-0">
            Zaheer Ahmed – Preisgucken<br />
            E-Mail: <a href="mailto:b2b@preisgucken.de">b2b@preisgucken.de</a>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
