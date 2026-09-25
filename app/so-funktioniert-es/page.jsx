import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { safeJsonLd } from "@/lib/jsonLd";

export const metadata = {
  title: "So funktioniert's – Preisgucken",
  description: "Erfahren Sie, wie Preisgucken.de funktioniert. Kostenlos Preise vergleichen, bestes Angebot finden und beim günstigsten Händler kaufen.",
  keywords: [
    "preisvergleich online shops deutschland",
    "preisvergleich ohne anmeldung",
    "günstigste angebote finden",
    "tagesaktuelle preise vergleichen",
    "preise objektiv vergleichen",
    "kaufberatung preisvergleich",
    "denkfehler beim preisvergleich",
  ],
};

// FAQPage structured data — lets Google surface these as rich Q&A
// snippets directly in search results, matching real question-shaped
// searches ("wie finde ich...", "warum lohnt sich...") without needing a
// dedicated page per topic. Every answer here also appears as visible
// on-page text below (Google's own guidance: FAQ markup must reflect
// real page content, not hidden-only data).
const faq = [
  {
    q: "Wie funktioniert Preisvergleich für Online-Shops in Deutschland?",
    a: "Preisgucken.de sammelt die Preise identischer Produkte aus geprüften, in Deutschland registrierten Online-Shops und zeigt sie nebeneinander an. Sie suchen ein Produkt, sehen auf einen Blick, wer es gerade am günstigsten anbietet, und kaufen direkt beim Händler — Preisgucken selbst verkauft nichts.",
  },
  {
    q: "Kann ich Preisgucken ohne Anmeldung nutzen?",
    a: "Ja, vollständig. Suchen, Kategorien durchsuchen, Preise vergleichen und zum Händler klicken funktioniert komplett ohne Konto. Nur für den optionalen Preisalarm hinterlegen Sie eine E-Mail-Adresse — mehr nicht.",
  },
  {
    q: "Wie finde ich die günstigsten Angebote am schnellsten?",
    a: "Suchen Sie mit der genauen Modellbezeichnung statt eines allgemeinen Begriffs, sortieren Sie nach Preis und achten Sie auf den Gesamtpreis inklusive Versandkosten. Bei Produkten ohne akuten Kaufdruck lohnt sich ein Preisalarm, statt den Preis manuell zu beobachten.",
  },
  {
    q: "Warum lohnt sich tagesaktueller Preisvergleich?",
    a: "Preise ändern sich laufend — je nach Händler, Lagerbestand und Nachfrage. Preisgucken aktualisiert Angebote täglich und zeigt auf jeder Produktseite den Preisverlauf der letzten 30 Tage, damit Sie sehen, ob ein Preis gerade wirklich günstig ist oder erst noch fallen könnte.",
  },
  {
    q: "Sind die Preise bei Preisgucken wirklich objektiv?",
    a: "Die Reihenfolge der Angebote richtet sich ausschließlich nach dem tatsächlichen Preis, nicht danach, welcher Händler mehr Provision zahlt. Preisgucken finanziert sich über Affiliate-Provisionen, wenn ein Kauf über einen Link zustande kommt — für Sie entstehen dadurch keine Mehrkosten, und die Darstellung der Preise bleibt davon unberührt.",
  },
  {
    q: "Hilft mir Preisgucken auch bei der Kaufentscheidung, nicht nur beim Preis?",
    a: "Der Preis ist ein Kriterium von mehreren. Produktseiten zeigen technische Details, EAN und Preisverlauf, Kategorieseiten helfen beim Eingrenzen der Auswahl. Für ausführlichere Kaufberatung zu einzelnen Produktarten finden Sie im Preisgucken-Ratgeber (preisgucken.com) vertiefende Guides.",
  },
  {
    q: "Welche Denkfehler sollte ich beim Preisvergleich vermeiden?",
    a: "Häufig: sich von einem durchgestrichenen „ursprünglichen” Preis blenden lassen, statt den echten Preisverlauf zu prüfen; Versandkosten erst an der Kasse bemerken; automatisch annehmen, der bekannteste Shop sei auch der günstigste; und aus Zeitdruck kaufen, obwohl ein Preisalarm den Kauf günstiger gemacht hätte.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function SoFunktioniertEsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="brand-heading fw-bold mb-2">So funktioniert Preisgucken</h1>
        <p className="text-muted mb-5">Kostenlos · Ohne Anmeldung · Täglich aktualisiert</p>

        {/* Steps */}
        <div className="row g-4 mb-5">
          <div className="col-md-4">
            <div className="text-center p-4" style={{ background: "#f8faff", borderRadius: 12 }}>
              <div className="mb-3" style={{ fontSize: 40 }}>🔍</div>
              <h2 className="h5 fw-bold mb-2">1. Produkt suchen</h2>
              <p className="text-muted small mb-0">
                Geben Sie den Produktnamen in die Suchleiste ein oder wählen Sie eine Kategorie.
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="text-center p-4" style={{ background: "#f8faff", borderRadius: 12 }}>
              <div className="mb-3" style={{ fontSize: 40 }}>📊</div>
              <h2 className="h5 fw-bold mb-2">2. Preise vergleichen</h2>
              <p className="text-muted small mb-0">
                Wir zeigen Ihnen die aktuellen Preise von geprüften deutschen Online-Händlern auf einen Blick.
              </p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="text-center p-4" style={{ background: "#f8faff", borderRadius: 12 }}>
              <div className="mb-3" style={{ fontSize: 40 }}>🛒</div>
              <h2 className="h5 fw-bold mb-2">3. Günstig kaufen</h2>
              <p className="text-muted small mb-0">
                Klicken Sie auf das beste Angebot und kaufen Sie direkt beim Händler — sicher und ohne Umwege.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-5">
          <h2 className="h5 fw-bold mb-3">Ihre Vorteile</h2>
          <ul className="list-unstyled">
            {[
              "100% kostenlos — keine versteckten Gebühren",
              "Keine Anmeldung erforderlich",
              "Preise täglich aktualisiert",
              "Nur geprüfte, in Deutschland registrierte Händler",
              "Preisalarm: Benachrichtigung wenn der Wunschpreis erreicht wird",
              "DSGVO-konform — Ihre Daten bleiben geschützt",
            ].map((item) => (
              <li key={item} className="mb-2 text-muted small">
                <span style={{ color: "#F5A623", fontWeight: 700, marginRight: 8 }}>✓</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Affiliate note */}
        <div className="p-4" style={{ background: "#fff8ee", borderRadius: 12, borderLeft: "4px solid #F5A623" }}>
          <h2 className="h6 fw-bold mb-1">Hinweis zu Affiliate-Links</h2>
          <p className="text-muted small mb-0">
            Preisgucken.de ist ein unabhängiges Preisvergleichsportal. Einige Links auf unserer Website sind
            Affiliate-Links — wenn Sie über diese Links einkaufen, erhalten wir eine kleine Provision vom Händler.
            Für Sie entstehen dabei keine zusätzlichen Kosten. Die Preisdarstellung bleibt davon unberührt und
            objektiv.
          </p>
        </div>

        {/* FAQ — mirrors faqJsonLd above so the FAQPage markup reflects
            real, visible page content, not hidden-only data. */}
        <div className="mt-5">
          <h2 className="h5 fw-bold mb-3">Häufige Fragen</h2>
          <div className="accordion" id="faqAccordion">
            {faq.map((item, i) => (
              <div className="accordion-item border mb-2 rounded" key={i}>
                <h3 className="accordion-header">
                  <button
                    className="accordion-button collapsed fw-semibold small"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target={`#faq${i}`}
                  >
                    {item.q}
                  </button>
                </h3>
                <div id={`faq${i}`} className="accordion-collapse collapse" data-bs-parent="#faqAccordion">
                  <div className="accordion-body small text-muted">{item.a}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="small text-muted mt-3 mb-0">
            Für ausführlichere Kaufberatung zu einzelnen Produktarten:{" "}
            <a href="https://www.preisgucken.com/blog/" target="_blank" rel="noopener">
              Preisgucken-Ratgeber auf preisgucken.com →
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
