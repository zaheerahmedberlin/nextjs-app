import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Datenschutzerklärung – Preisgucken",
  description: "Datenschutzerklärung von Preisgucken.de gemäß DSGVO / GDPR.",
  robots: { index: true, follow: false },
};

export default function DatenschutzPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="fw-bold mb-2">Datenschutzerklärung</h1>
        <p className="text-muted small mb-5">Stand: Juli 2025</p>

        {/* 1 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">1. Verantwortlicher</h2>
          <p className="small text-muted">
            Preisgucken™, Inhaber: Zaheer Ahmed, Ollenhauerstr. 95A, 13403 Berlin<br />
            E-Mail: <a href="mailto:b2b@preisgucken.de">b2b@preisgucken.de</a>
          </p>
        </section>

        {/* 2 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">2. Welche Daten wir erheben</h2>
          <p className="small text-muted">
            Beim Besuch unserer Website speichert unser Hosting-Anbieter automatisch sog.
            Server-Logfiles. Diese enthalten: IP-Adresse (anonymisiert), Datum/Uhrzeit, aufgerufene
            URL, HTTP-Statuscode, Referrer-URL sowie Browser-User-Agent. Diese Daten sind technisch
            notwendig (Art. 6 Abs. 1 lit. f DSGVO) und werden nach 7 Tagen gelöscht.
          </p>
          <p className="small text-muted mb-0">
            Wir speichern keine personenbezogenen Daten in Benutzerkonten, da keine Registrierung
            erforderlich ist.
          </p>
        </section>

        {/* 3 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">3. Cookies</h2>
          <p className="small text-muted">
            Wir verwenden ausschließlich technisch notwendige Cookies (z. B. für Cookie-Einstellungen).
            Statistik- oder Marketing-Cookies werden nur mit Ihrer ausdrücklichen Einwilligung gesetzt
            (Art. 6 Abs. 1 lit. a DSGVO). Sie können Ihre Einwilligung jederzeit unter{" "}
            <a href="/cookie-einstellungen">Cookie-Einstellungen</a> widerrufen.
          </p>
        </section>

        {/* 4 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">4. Google Analytics</h2>
          <p className="small text-muted">
            Wir setzen Google Analytics 4 (Google LLC, USA) nur ein, wenn Sie der Statistik-Kategorie
            im Cookie-Banner zugestimmt haben. Die Daten werden pseudonymisiert (IP-Anonymisierung
            aktiviert) und unterliegen dem EU-US Data Privacy Framework. Sie können der
            Verarbeitung unter <a href="/cookie-einstellungen">Cookie-Einstellungen</a> widersprechen.
          </p>
        </section>

        {/* 5 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">5. Affiliate-Links & externe Händler</h2>
          <p className="small text-muted">
            Unsere Website enthält Links zu externen Online-Shops (z. B. Home24, XXXLutz, Amazon).
            Wenn Sie auf einen solchen Link klicken, übermitteln wir keine personenbezogenen Daten
            an den Händler. Der Händler kann jedoch durch seinen eigenen Tracking-Mechanismus
            (Cookies, Fingerprinting) Ihre Nutzung erfassen – bitte beachten Sie die
            Datenschutzerklärung des jeweiligen Händlers. Wir erhalten ggf. eine Provision über
            Affiliate-Netzwerke (z. B. Awin, Amazon PartnerNet).
          </p>
        </section>

        {/* 6 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">6. Hosting (Railway)</h2>
          <p className="small text-muted">
            Unsere Website wird von Railway Technologies Inc. (USA) gehostet. Die Datenübertragung
            in die USA erfolgt auf Grundlage von Standardvertragsklauseln (Art. 46 Abs. 2 lit. c
            DSGVO). Weitere Informationen:{" "}
            <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer">
              railway.app/legal/privacy
            </a>
          </p>
        </section>

        {/* 7 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">7. Ihre Rechte</h2>
          <p className="small text-muted mb-1">
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung,
            Datenübertragbarkeit und Widerspruch. Außerdem haben Sie das Recht, eine Beschwerde bei
            der zuständigen Aufsichtsbehörde einzureichen:
          </p>
          <p className="small text-muted mb-0">
            Berliner Beauftragte für Datenschutz und Informationsfreiheit<br />
            Alt-Moabit 59–61, 10555 Berlin<br />
            <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer">
              www.datenschutz-berlin.de
            </a>
          </p>
        </section>

        {/* 8 */}
        <section className="mb-4">
          <h2 className="h5 fw-bold">8. Kontakt</h2>
          <p className="small text-muted mb-0">
            Bei datenschutzrechtlichen Fragen wenden Sie sich bitte an:{" "}
            <a href="mailto:b2b@preisgucken.de">b2b@preisgucken.de</a>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
