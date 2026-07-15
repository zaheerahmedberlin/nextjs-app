import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Impressum – Preisgucken",
  description: "Impressum und Anbieterkennzeichnung von Preisgucken.de gemäß § 5 TMG.",
  robots: { index: true, follow: false },
};

export default function ImpressumPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="fw-bold mb-4">Impressum</h1>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Angaben gemäß § 5 TMG</h2>
          <p className="mb-1 fw-bold">Preisgucken™</p>
          <p className="mb-1">Inhaber: Zaheer Ahmed</p>
          <p className="mb-1">Ollenhauerstr. 95A</p>
          <p className="mb-1">13403 Berlin</p>
          <p className="mb-0">Deutschland</p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Kontakt</h2>
          <p className="mb-1">E-Mail: <a href="mailto:info@preisgucken.de">info@preisgucken.de</a></p>
          <p className="mb-1">Tel: <a href="tel:+4930035055214">030 35055214</a></p>
          <p className="mb-0">Website: <a href="https://www.preisgucken.de">www.preisgucken.de</a></p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Umsatzsteuer-ID</h2>
          <p className="text-muted small mb-0">
            Nach Erteilung der Steuernummer durch das Finanzamt wird diese hier ergänzt.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p className="mb-1">Zaheer Ahmed</p>
          <p className="mb-1">Ollenhauerstr. 95A</p>
          <p className="mb-0">13403 Berlin</p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Streitschlichtung</h2>
          <p className="small text-muted">
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer">
              https://ec.europa.eu/consumers/odr/
            </a>
          </p>
          <p className="small text-muted mb-0">
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
            Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Haftung für Inhalte</h2>
          <p className="small text-muted">
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach
            den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter
            jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen
            oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen
            zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben
            hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis
            einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen
            werden wir diese Inhalte umgehend entfernen.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Affiliate-Hinweis</h2>
          <p className="small text-muted">
            Diese Website enthält Affiliate-Links. Wenn Sie über diese Links einkaufen, erhalten wir
            eine Provision – für Sie entstehen dabei keine zusätzlichen Kosten. Alle Preisangaben
            sind unverbindlich und können sich seit der letzten Aktualisierung geändert haben.
            Bitte prüfen Sie den aktuellen Preis auf der Seite des jeweiligen Händlers.
          </p>
        </section>

        <section className="mb-4">
          <h2 className="h5 fw-bold">Urheberrecht</h2>
          <p className="small text-muted">
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
            dem deutschen Urheberrecht. Produktbilder und -beschreibungen stammen von den jeweiligen
            Händlern und verbleiben im Eigentum der entsprechenden Rechteinhaber.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
