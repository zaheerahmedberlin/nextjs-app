// app/haendler-registrierung/page.jsx
export const metadata = {
  title: "Händler-Registrierung – Produkte listen auf Preisgucken.de",
  description:
    "Registrieren Sie Ihr Unternehmen als Händler auf Preisgucken.de und präsentieren Sie Ihre Produkte Millionen deutschen Verbrauchern.",
};

import B2BForm from "./B2BForm";

export default function HaendlerRegistrierungPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section style={{ background: "var(--pg-blue)", color: "#fff", padding: "3rem 0 2.5rem" }}>
        <div className="container text-center">
          <a href="/" style={{ display: "inline-block", marginBottom: "1.5rem" }}>
            <img src="/preis-gucken-logo.png" alt="Preisgucken" height={48} />
          </a>
          <h1 className="fw-bold mb-2" style={{ fontSize: "2rem" }}>
            Händler-Registrierung
          </h1>
          <p className="mb-0" style={{ opacity: 0.85, maxWidth: 560, margin: "0 auto" }}>
            Präsentieren Sie Ihre Produkte auf Preisgucken.de und erreichen Sie täglich tausende
            preisbewusste Käufer in Deutschland.
          </p>
        </div>
      </section>

      {/* ── Benefits bar ── */}
      <section style={{ background: "var(--pg-blue-light)", borderBottom: "1px solid #d0daf0" }}>
        <div className="container py-3">
          <div className="row text-center g-2">
            {[
              { icon: "bi-graph-up-arrow", text: "Mehr Sichtbarkeit" },
              { icon: "bi-shield-check", text: "DSGVO-konform" },
              { icon: "bi-clock-history", text: "Tagesaktuelle Preise" },
              { icon: "bi-headset", text: "Persönlicher Support" },
            ].map((b) => (
              <div key={b.text} className="col-6 col-md-3">
                <i className={`bi ${b.icon} fs-4`} style={{ color: "var(--pg-blue)" }} />
                <p className="small fw-semibold mb-0 mt-1">{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Form ── */}
      <section className="py-5">
        <div className="container">
          <B2BForm />
        </div>
      </section>

      {/* ── Footer note ── */}
      <section style={{ background: "#f8f9fa", borderTop: "1px solid #dee2e6" }}>
        <div className="container py-4 text-center">
          <p className="text-muted small mb-1">
            Bei Fragen wenden Sie sich an{" "}
            <a href="mailto:b2b@preisgucken.de" style={{ color: "var(--pg-blue)" }}>
              b2b@preisgucken.de
            </a>
          </p>
          <p className="text-muted small mb-0">
            <a href="/datenschutz" style={{ color: "var(--pg-blue)" }}>Datenschutz</a>
            {" · "}
            <a href="/agb" style={{ color: "var(--pg-blue)" }}>AGB</a>
            {" · "}
            <a href="/impressum" style={{ color: "var(--pg-blue)" }}>Impressum</a>
          </p>
        </div>
      </section>
    </main>
  );
}
