import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata = {
  title: "So funktioniert's – Preisgucken",
  description: "Erfahren Sie, wie Preisgucken.de funktioniert. Kostenlos Preise vergleichen, bestes Angebot finden und beim günstigsten Händler kaufen.",
};

export default function SoFunktioniertEsPage() {
  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 760 }}>
        <h1 className="fw-bold mb-2">So funktioniert Preisgucken</h1>
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
      </main>
      <Footer />
    </>
  );
}
