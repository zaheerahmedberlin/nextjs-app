"use client";
import { useState } from "react";
import PrintSummary from "./PrintSummary";

const STEPS = [
  "Unternehmensdaten",
  "Ansprechpartner",
  "Produktkatalog",
  "Technische Integration",
  "Vertrag & Rechtliches",
];

const INITIAL = {
  // Step 1 — Unternehmensdaten
  firmenname: "",
  rechtsform: "",
  handelsregisterNr: "",
  handelsregisterGericht: "",
  ustIdNr: "",
  strasse: "",
  plz: "",
  ort: "",
  land: "Deutschland",
  website: "",
  gruendungsjahr: "",
  mitarbeiteranzahl: "",
  jahresumsatz: "",

  // Step 2 — Ansprechpartner
  anredeKontakt: "",
  vornameKontakt: "",
  nachnameKontakt: "",
  positionKontakt: "",
  emailKontakt: "",
  telefonKontakt: "",
  anredeTech: "",
  vornameTech: "",
  nachnameTech: "",
  emailTech: "",
  telefonTech: "",

  // Step 3 — Produktkatalog
  kategorien: [],
  produktanzahl: "",
  produktbeschreibung: "",
  updateFrequenz: "",
  bildqualitaet: "",
  preismodell: "",
  mindestpreis: "",
  hoechstpreis: "",
  waehrung: "EUR",
  versandlaender: [],
  rueckgaberecht: "",

  // Step 4 — Technische Integration
  integrationsmethode: "",
  feedUrl: "",
  feedFormat: "",
  feedUpdateIntervall: "",
  apiVerfuegbar: "",
  testZugang: "",
  technischeAnmerkungen: "",

  // Step 5 — Vertrag & Rechtliches
  provisionModell: "",
  provisionSatz: "",
  zahlungsziel: "",
  agbGelesen: false,
  datenschutzGelesen: false,
  avvAkzeptiert: false,
  wettbewerbsklauselAkzeptiert: false,
  qualitaetsrichtlinienAkzeptiert: false,
  unterschriftName: "",
  unterschriftDatum: "",
  unterschriftOrt: "",
};

const KATEGORIEN_OPTIONS = [
  "Elektronik", "Computer & Zubehör", "Smartphones & Tablets",
  "Möbel & Wohnen", "Küche & Haushalt", "Garten & Outdoor",
  "Mode & Bekleidung", "Sport & Freizeit", "Baby & Kind",
  "Gesundheit & Pflege", "Büro & Schreibwaren", "Spielzeug",
  "Lebensmittel", "Baumarkt & Werkzeug", "Sonstiges",
];

const VERSAND_OPTIONS = [
  "Deutschland", "Österreich", "Schweiz", "EU-weit", "Weltweit",
];

function ProgressBar({ step }) {
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between mb-1">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className="text-center flex-fill"
            style={{ fontSize: "0.65rem", color: i <= step ? "var(--pg-blue)" : "#aaa", fontWeight: i === step ? 700 : 400 }}
          >
            <div
              style={{
                width: 28, height: 28, borderRadius: "50%",
                background: i < step ? "var(--pg-blue)" : i === step ? "var(--pg-orange)" : "#dee2e6",
                color: i <= step ? "#fff" : "#888",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 4px", fontSize: "0.8rem", fontWeight: 700,
              }}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className="d-none d-md-block">{label}</span>
          </div>
        ))}
      </div>
      <div className="progress" style={{ height: 4 }}>
        <div
          className="progress-bar"
          style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: "var(--pg-blue)" }}
        />
      </div>
    </div>
  );
}

function Field({ label, required, error, children, hint }) {
  return (
    <div className="mb-3">
      <label className="form-label fw-semibold" style={{ fontSize: "0.88rem" }}>
        {label}{required && <span className="text-danger ms-1">*</span>}
      </label>
      {children}
      {hint && <div className="form-text text-muted">{hint}</div>}
      {error && <div className="text-danger" style={{ fontSize: "0.8rem" }}>{error}</div>}
    </div>
  );
}

export default function B2BForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedForm, setSubmittedForm] = useState(null);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function toggleArr(field, value) {
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(value)
        ? f[field].filter((v) => v !== value)
        : [...f[field], value],
    }));
  }

  function validateStep(s) {
    const e = {};
    if (s === 0) {
      if (!form.firmenname.trim()) e.firmenname = "Pflichtfeld";
      if (!form.rechtsform) e.rechtsform = "Pflichtfeld";
      if (!form.ustIdNr.trim()) e.ustIdNr = "Pflichtfeld";
      if (!form.strasse.trim()) e.strasse = "Pflichtfeld";
      if (!form.plz.trim()) e.plz = "Pflichtfeld";
      if (!form.ort.trim()) e.ort = "Pflichtfeld";
      if (!form.website.trim()) e.website = "Pflichtfeld";
    }
    if (s === 1) {
      if (!form.vornameKontakt.trim()) e.vornameKontakt = "Pflichtfeld";
      if (!form.nachnameKontakt.trim()) e.nachnameKontakt = "Pflichtfeld";
      if (!form.positionKontakt.trim()) e.positionKontakt = "Pflichtfeld";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.emailKontakt)) e.emailKontakt = "Gültige E-Mail erforderlich";
      if (!form.telefonKontakt.trim()) e.telefonKontakt = "Pflichtfeld";
    }
    if (s === 2) {
      if (form.kategorien.length === 0) e.kategorien = "Mindestens eine Kategorie wählen";
      if (!form.produktanzahl) e.produktanzahl = "Pflichtfeld";
      if (!form.updateFrequenz) e.updateFrequenz = "Pflichtfeld";
      if (!form.preismodell) e.preismodell = "Pflichtfeld";
    }
    if (s === 3) {
      if (!form.integrationsmethode) e.integrationsmethode = "Pflichtfeld";
    }
    if (s === 4) {
      if (!form.agbGelesen) e.agbGelesen = "Bitte AGB akzeptieren";
      if (!form.datenschutzGelesen) e.datenschutzGelesen = "Bitte Datenschutzerklärung akzeptieren";
      if (!form.avvAkzeptiert) e.avvAkzeptiert = "Auftragsverarbeitungsvertrag muss akzeptiert werden";
      if (!form.qualitaetsrichtlinienAkzeptiert) e.qualitaetsrichtlinienAkzeptiert = "Pflichtfeld";
      if (!form.unterschriftName.trim()) e.unterschriftName = "Vor- und Nachname erforderlich";
      if (!form.unterschriftOrt.trim()) e.unterschriftOrt = "Ort erforderlich";
      if (!form.unterschriftDatum) e.unterschriftDatum = "Datum erforderlich";
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setErrors({});
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const e = validateStep(4);
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await fetch("/api/b2b-registrierung", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSubmittedForm({ ...form });
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      alert("Fehler beim Senden. Bitte versuchen Sie es erneut oder schreiben Sie an b2b@preisgucken.de");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted && submittedForm) {
    return (
      <div>
        {/* ── Screen: success banner (hidden on print) ── */}
        <div className="pg-no-print">
          <div className="text-center py-4">
            <div style={{ fontSize: "3.5rem" }}>✅</div>
            <h2 className="fw-bold mt-2" style={{ color: "var(--pg-blue)" }}>
              Registrierung eingegangen!
            </h2>
            <p className="text-muted mb-3" style={{ maxWidth: 520, margin: "0 auto" }}>
              Vielen Dank, <strong>{submittedForm.firmenname}</strong>. Wir melden uns innerhalb
              von <strong>2 Werktagen</strong> bei <strong>{submittedForm.emailKontakt}</strong>.
            </p>

            <div className="d-flex justify-content-center gap-2 flex-wrap mb-4">
              <button
                className="btn fw-semibold px-4"
                style={{ background: "var(--pg-blue)", color: "#fff" }}
                onClick={() => window.print()}
              >
                <i className="bi bi-printer me-2" />Drucken / Als PDF speichern
              </button>
              <a href="/" className="btn btn-outline-secondary">
                <i className="bi bi-house me-2" />Zur Startseite
              </a>
              <a href="mailto:b2b@preisgucken.de" className="btn btn-outline-secondary">
                <i className="bi bi-envelope me-2" />B2B-Team kontaktieren
              </a>
            </div>

            <div className="alert alert-info d-inline-flex align-items-center gap-2 text-start" style={{ maxWidth: 520, fontSize: "0.85rem" }}>
              <i className="bi bi-info-circle-fill fs-5" />
              <span>
                Unten sehen Sie Ihre vollständige Vertragsübersicht. Klicken Sie{" "}
                <strong>„Drucken / Als PDF speichern"</strong> → im Druckdialog{" "}
                <strong>„Als PDF speichern"</strong> wählen.
              </span>
            </div>
          </div>

          <hr className="my-3" />

          {/* ── Nächste Schritte ── */}
          <div className="row g-3 mb-4">
            {[
              { icon: "bi-clipboard-check", step: "01", label: "Prüfung", text: "Unser B2B-Team prüft Ihre Angaben und das Produktsortiment." },
              { icon: "bi-envelope-check", step: "02", label: "Kontaktaufnahme", text: "Wir melden uns innerhalb von 2 Werktagen per E-Mail." },
              { icon: "bi-plug", step: "03", label: "Integration", text: "Feed-Anbindung, API oder manueller Upload wird eingerichtet." },
              { icon: "bi-rocket-takeoff", step: "04", label: "Go-Live", text: "Ihre Produkte sind innerhalb von 5–7 Werktagen live." },
            ].map((s) => (
              <div key={s.step} className="col-6 col-md-3">
                <div className="card border-0 shadow-sm h-100 p-3 text-center">
                  <div style={{ fontSize: "1.8rem", color: "var(--pg-blue)" }}>
                    <i className={`bi ${s.icon}`} />
                  </div>
                  <div className="fw-bold small mt-1">{s.label}</div>
                  <div className="text-muted" style={{ fontSize: "0.78rem" }}>{s.text}</div>
                </div>
              </div>
            ))}
          </div>

          <h5 className="fw-bold mb-3" style={{ color: "var(--pg-blue)" }}>
            <i className="bi bi-file-earmark-text me-2" />Ihre Vertragsübersicht (Vorschau)
          </h5>
        </div>

        {/* ── Print / PDF document — visible on screen as preview, full page on print ── */}
        <div className="pg-print-portal">
          <PrintSummary form={submittedForm} />
        </div>

        <div className="pg-no-print text-center mt-4 pb-3">
          <button
            className="btn btn-lg fw-semibold px-5"
            style={{ background: "var(--pg-blue)", color: "#fff" }}
            onClick={() => window.print()}
          >
            <i className="bi bi-file-pdf me-2" />Als PDF herunterladen
          </button>
          <p className="text-muted mt-2" style={{ fontSize: "0.78rem" }}>
            Im Druckdialog „Ziel" → „Als PDF speichern" wählen (Chrome/Edge/Firefox).
          </p>
        </div>

        <style>{`
          @media print {
            body > * { display: none !important; }
            .pg-print-portal { display: block !important; }
            .pg-no-print { display: none !important; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-lg-9 col-xl-8">
        <ProgressBar step={step} />

        {/* ── STEP 0: Unternehmensdaten ── */}
        {step === 0 && (
          <div className="card border-0 shadow-sm p-4">
            <h4 className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
              <i className="bi bi-building me-2" />Unternehmensdaten
            </h4>
            <p className="text-muted small mb-4">
              Diese Angaben werden für den Händlervertrag und die rechtliche Prüfung benötigt.
            </p>

            <div className="row g-3">
              <div className="col-12">
                <Field label="Firmenname / Handelsname" required error={errors.firmenname}>
                  <input className={`form-control ${errors.firmenname ? "is-invalid" : ""}`}
                    value={form.firmenname} onChange={(e) => set("firmenname", e.target.value)}
                    placeholder="z. B. Mustermann GmbH" />
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Rechtsform" required error={errors.rechtsform}>
                  <select className={`form-select ${errors.rechtsform ? "is-invalid" : ""}`}
                    value={form.rechtsform} onChange={(e) => set("rechtsform", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    {["GmbH", "GmbH & Co. KG", "AG", "UG (haftungsbeschränkt)", "OHG", "KG",
                      "Einzelunternehmen / e.K.", "GbR", "Sonstiges"].map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="USt-IdNr." required error={errors.ustIdNr}
                  hint="Format: DE123456789">
                  <input className={`form-control ${errors.ustIdNr ? "is-invalid" : ""}`}
                    value={form.ustIdNr} onChange={(e) => set("ustIdNr", e.target.value)}
                    placeholder="DE123456789" />
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Handelsregisternummer" hint="z. B. HRB 12345">
                  <input className="form-control" value={form.handelsregisterNr}
                    onChange={(e) => set("handelsregisterNr", e.target.value)}
                    placeholder="HRB 12345" />
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Registergericht">
                  <input className="form-control" value={form.handelsregisterGericht}
                    onChange={(e) => set("handelsregisterGericht", e.target.value)}
                    placeholder="Amtsgericht München" />
                </Field>
              </div>

              <div className="col-12">
                <Field label="Straße & Hausnummer" required error={errors.strasse}>
                  <input className={`form-control ${errors.strasse ? "is-invalid" : ""}`}
                    value={form.strasse} onChange={(e) => set("strasse", e.target.value)}
                    placeholder="Musterstraße 1" />
                </Field>
              </div>

              <div className="col-4">
                <Field label="PLZ" required error={errors.plz}>
                  <input className={`form-control ${errors.plz ? "is-invalid" : ""}`}
                    value={form.plz} onChange={(e) => set("plz", e.target.value)}
                    placeholder="80331" maxLength={10} />
                </Field>
              </div>

              <div className="col-8">
                <Field label="Stadt" required error={errors.ort}>
                  <input className={`form-control ${errors.ort ? "is-invalid" : ""}`}
                    value={form.ort} onChange={(e) => set("ort", e.target.value)}
                    placeholder="München" />
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Land">
                  <select className="form-select" value={form.land} onChange={(e) => set("land", e.target.value)}>
                    {["Deutschland", "Österreich", "Schweiz", "Sonstiges"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Website / Shop-URL" required error={errors.website}>
                  <input className={`form-control ${errors.website ? "is-invalid" : ""}`}
                    value={form.website} onChange={(e) => set("website", e.target.value)}
                    placeholder="https://www.ihreshop.de" type="url" />
                </Field>
              </div>

              <div className="col-md-4">
                <Field label="Gründungsjahr">
                  <input className="form-control" value={form.gruendungsjahr} type="number"
                    min={1900} max={2026}
                    onChange={(e) => set("gruendungsjahr", e.target.value)} placeholder="2010" />
                </Field>
              </div>

              <div className="col-md-4">
                <Field label="Mitarbeiteranzahl">
                  <select className="form-select" value={form.mitarbeiteranzahl}
                    onChange={(e) => set("mitarbeiteranzahl", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    {["1–10", "11–50", "51–200", "201–500", "500+"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="col-md-4">
                <Field label="Jahresumsatz (ca.)">
                  <select className="form-select" value={form.jahresumsatz}
                    onChange={(e) => set("jahresumsatz", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    {["unter 100.000 €", "100.000 – 500.000 €", "500.000 – 2 Mio. €",
                      "2 – 10 Mio. €", "über 10 Mio. €", "keine Angabe"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 1: Ansprechpartner ── */}
        {step === 1 && (
          <div className="card border-0 shadow-sm p-4">
            <h4 className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
              <i className="bi bi-person-lines-fill me-2" />Ansprechpartner
            </h4>
            <p className="text-muted small mb-4">
              Bitte nennen Sie uns einen kaufmännischen und einen technischen Ansprechpartner.
            </p>

            <h6 className="fw-bold text-uppercase" style={{ fontSize: "0.75rem", color: "#888", letterSpacing: 1 }}>
              Kaufmännischer Kontakt
            </h6>
            <div className="row g-3 mb-4">
              <div className="col-md-2">
                <Field label="Anrede">
                  <select className="form-select" value={form.anredeKontakt}
                    onChange={(e) => set("anredeKontakt", e.target.value)}>
                    <option value="">–</option>
                    <option>Herr</option><option>Frau</option><option>Divers</option>
                  </select>
                </Field>
              </div>
              <div className="col-md-5">
                <Field label="Vorname" required error={errors.vornameKontakt}>
                  <input className={`form-control ${errors.vornameKontakt ? "is-invalid" : ""}`}
                    value={form.vornameKontakt} onChange={(e) => set("vornameKontakt", e.target.value)} />
                </Field>
              </div>
              <div className="col-md-5">
                <Field label="Nachname" required error={errors.nachnameKontakt}>
                  <input className={`form-control ${errors.nachnameKontakt ? "is-invalid" : ""}`}
                    value={form.nachnameKontakt} onChange={(e) => set("nachnameKontakt", e.target.value)} />
                </Field>
              </div>
              <div className="col-md-4">
                <Field label="Position / Funktion" required error={errors.positionKontakt}>
                  <input className={`form-control ${errors.positionKontakt ? "is-invalid" : ""}`}
                    value={form.positionKontakt} onChange={(e) => set("positionKontakt", e.target.value)}
                    placeholder="z. B. Geschäftsführer" />
                </Field>
              </div>
              <div className="col-md-4">
                <Field label="E-Mail" required error={errors.emailKontakt}>
                  <input className={`form-control ${errors.emailKontakt ? "is-invalid" : ""}`}
                    type="email" value={form.emailKontakt}
                    onChange={(e) => set("emailKontakt", e.target.value)} />
                </Field>
              </div>
              <div className="col-md-4">
                <Field label="Telefon" required error={errors.telefonKontakt}>
                  <input className={`form-control ${errors.telefonKontakt ? "is-invalid" : ""}`}
                    type="tel" value={form.telefonKontakt}
                    onChange={(e) => set("telefonKontakt", e.target.value)}
                    placeholder="+49 89 1234567" />
                </Field>
              </div>
            </div>

            <hr />
            <h6 className="fw-bold text-uppercase mt-3" style={{ fontSize: "0.75rem", color: "#888", letterSpacing: 1 }}>
              Technischer Kontakt <span className="fw-normal text-muted">(optional, falls abweichend)</span>
            </h6>
            <div className="row g-3">
              <div className="col-md-2">
                <Field label="Anrede">
                  <select className="form-select" value={form.anredeTech}
                    onChange={(e) => set("anredeTech", e.target.value)}>
                    <option value="">–</option>
                    <option>Herr</option><option>Frau</option><option>Divers</option>
                  </select>
                </Field>
              </div>
              <div className="col-md-5">
                <Field label="Vorname">
                  <input className="form-control" value={form.vornameTech}
                    onChange={(e) => set("vornameTech", e.target.value)} />
                </Field>
              </div>
              <div className="col-md-5">
                <Field label="Nachname">
                  <input className="form-control" value={form.nachnameTech}
                    onChange={(e) => set("nachnameTech", e.target.value)} />
                </Field>
              </div>
              <div className="col-md-6">
                <Field label="E-Mail">
                  <input className="form-control" type="email" value={form.emailTech}
                    onChange={(e) => set("emailTech", e.target.value)} />
                </Field>
              </div>
              <div className="col-md-6">
                <Field label="Telefon">
                  <input className="form-control" type="tel" value={form.telefonTech}
                    onChange={(e) => set("telefonTech", e.target.value)}
                    placeholder="+49 89 1234567" />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Produktkatalog ── */}
        {step === 2 && (
          <div className="card border-0 shadow-sm p-4">
            <h4 className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
              <i className="bi bi-box-seam me-2" />Produktkatalog
            </h4>
            <p className="text-muted small mb-4">
              Informationen zu Ihrem Produktsortiment und Angebotsstruktur.
            </p>

            <Field label="Produktkategorien" required error={errors.kategorien}
              hint="Mehrfachauswahl möglich">
              <div className="row g-2 mt-1">
                {KATEGORIEN_OPTIONS.map((k) => (
                  <div key={k} className="col-6 col-md-4">
                    <div className="form-check">
                      <input className="form-check-input" type="checkbox"
                        id={`kat-${k}`} checked={form.kategorien.includes(k)}
                        onChange={() => toggleArr("kategorien", k)} />
                      <label className="form-check-label small" htmlFor={`kat-${k}`}>{k}</label>
                    </div>
                  </div>
                ))}
              </div>
              {errors.kategorien && <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>{errors.kategorien}</div>}
            </Field>

            <div className="row g-3 mt-1">
              <div className="col-md-4">
                <Field label="Anzahl Produkte (ca.)" required error={errors.produktanzahl}>
                  <select className={`form-select ${errors.produktanzahl ? "is-invalid" : ""}`}
                    value={form.produktanzahl} onChange={(e) => set("produktanzahl", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    {["1–100", "101–500", "501–2.000", "2.001–10.000", "10.000–50.000", "über 50.000"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="col-md-4">
                <Field label="Preisspanne – Min. (€)">
                  <input className="form-control" type="number" min={0}
                    value={form.mindestpreis} onChange={(e) => set("mindestpreis", e.target.value)}
                    placeholder="z. B. 5" />
                </Field>
              </div>

              <div className="col-md-4">
                <Field label="Preisspanne – Max. (€)">
                  <input className="form-control" type="number" min={0}
                    value={form.hoechstpreis} onChange={(e) => set("hoechstpreis", e.target.value)}
                    placeholder="z. B. 2000" />
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Preismodell" required error={errors.preismodell}
                  hint="Wie werden Preise zwischen uns und Ihnen abgerechnet?">
                  <select className={`form-select ${errors.preismodell ? "is-invalid" : ""}`}
                    value={form.preismodell} onChange={(e) => set("preismodell", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    <option value="cpc">CPC – Cost per Click</option>
                    <option value="cpa">CPA – Cost per Action / Provision</option>
                    <option value="flat">Flat-Fee / Monatliche Pauschale</option>
                    <option value="free">Kostenlos (Basis-Listing)</option>
                  </select>
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Feed-Aktualisierung" required error={errors.updateFrequenz}>
                  <select className={`form-select ${errors.updateFrequenz ? "is-invalid" : ""}`}
                    value={form.updateFrequenz} onChange={(e) => set("updateFrequenz", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    {["Täglich", "Zweimal täglich", "Stündlich", "Wöchentlich", "Manuell"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="col-12">
                <Field label="Versandländer" hint="Mehrfachauswahl möglich">
                  <div className="d-flex flex-wrap gap-3 mt-1">
                    {VERSAND_OPTIONS.map((v) => (
                      <div key={v} className="form-check">
                        <input className="form-check-input" type="checkbox"
                          id={`versand-${v}`} checked={form.versandlaender.includes(v)}
                          onChange={() => toggleArr("versandlaender", v)} />
                        <label className="form-check-label small" htmlFor={`versand-${v}`}>{v}</label>
                      </div>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="col-md-6">
                <Field label="Rückgaberecht" hint="Wie viele Tage?">
                  <select className="form-select" value={form.rueckgaberecht}
                    onChange={(e) => set("rueckgaberecht", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    {["14 Tage (gesetzlich)", "30 Tage", "60 Tage", "90 Tage", "Kein Rückgaberecht"].map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="col-12">
                <Field label="Kurzbeschreibung Ihres Sortiments">
                  <textarea className="form-control" rows={3} value={form.produktbeschreibung}
                    onChange={(e) => set("produktbeschreibung", e.target.value)}
                    placeholder="z. B. Spezialisiert auf Markenmöbel im mittleren Preissegment für den deutschen Markt..." />
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: Technische Integration ── */}
        {step === 3 && (
          <div className="card border-0 shadow-sm p-4">
            <h4 className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
              <i className="bi bi-gear-fill me-2" />Technische Integration
            </h4>
            <p className="text-muted small mb-4">
              Wie sollen Ihre Produkte zu uns übertragen werden?
            </p>

            <Field label="Integrationsmethode" required error={errors.integrationsmethode}>
              <div className="row g-2 mt-1">
                {[
                  { value: "feed", label: "Produkt-Feed (CSV / XML / JSON)", icon: "bi-file-earmark-code" },
                  { value: "api", label: "API-Anbindung (REST)", icon: "bi-plug" },
                  { value: "upload", label: "Manueller Datei-Upload", icon: "bi-cloud-upload" },
                  { value: "scraping", label: "Web-Scraping durch Preisgucken", icon: "bi-robot" },
                ].map((opt) => (
                  <div key={opt.value} className="col-md-6">
                    <div
                      className={`border rounded p-3 d-flex align-items-center gap-2 cursor-pointer`}
                      style={{
                        cursor: "pointer",
                        borderColor: form.integrationsmethode === opt.value ? "var(--pg-blue)" : "#dee2e6",
                        background: form.integrationsmethode === opt.value ? "var(--pg-blue-light)" : "#fff",
                      }}
                      onClick={() => set("integrationsmethode", opt.value)}
                    >
                      <i className={`bi ${opt.icon} fs-4`} style={{ color: "var(--pg-blue)" }} />
                      <span className="fw-semibold" style={{ fontSize: "0.9rem" }}>{opt.label}</span>
                    </div>
                  </div>
                ))}
              </div>
              {errors.integrationsmethode && <div className="text-danger mt-1" style={{ fontSize: "0.8rem" }}>{errors.integrationsmethode}</div>}
            </Field>

            {(form.integrationsmethode === "feed") && (
              <div className="row g-3 mt-2">
                <div className="col-md-8">
                  <Field label="Feed-URL" hint="Direkt-Link zur Feed-Datei">
                    <input className="form-control" type="url" value={form.feedUrl}
                      onChange={(e) => set("feedUrl", e.target.value)}
                      placeholder="https://ihreshop.de/feed/produkte.xml" />
                  </Field>
                </div>
                <div className="col-md-4">
                  <Field label="Dateiformat">
                    <select className="form-select" value={form.feedFormat}
                      onChange={(e) => set("feedFormat", e.target.value)}>
                      <option value="">– wählen –</option>
                      <option>CSV</option><option>XML</option>
                      <option>JSON</option><option>Google Shopping XML</option>
                    </select>
                  </Field>
                </div>
                <div className="col-md-6">
                  <Field label="Update-Intervall des Feeds">
                    <select className="form-select" value={form.feedUpdateIntervall}
                      onChange={(e) => set("feedUpdateIntervall", e.target.value)}>
                      <option value="">– wählen –</option>
                      {["Stündlich", "Alle 4 Stunden", "Täglich", "Wöchentlich"].map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>
            )}

            {form.integrationsmethode === "api" && (
              <div className="row g-3 mt-2">
                <div className="col-12">
                  <Field label="API-Dokumentation URL">
                    <input className="form-control" type="url" value={form.apiVerfuegbar}
                      onChange={(e) => set("apiVerfuegbar", e.target.value)}
                      placeholder="https://docs.ihreshop.de/api" />
                  </Field>
                </div>
                <div className="col-12">
                  <Field label="Test-Zugangsdaten / Sandbox verfügbar?">
                    <select className="form-select" value={form.testZugang}
                      onChange={(e) => set("testZugang", e.target.value)}>
                      <option value="">– wählen –</option>
                      <option value="ja">Ja, Sandbox/Test-Umgebung vorhanden</option>
                      <option value="nein">Nein, nur Produktions-API</option>
                    </select>
                  </Field>
                </div>
              </div>
            )}

            <div className="mt-3">
              <Field label="Technische Anmerkungen / Besonderheiten">
                <textarea className="form-control" rows={3} value={form.technischeAnmerkungen}
                  onChange={(e) => set("technischeAnmerkungen", e.target.value)}
                  placeholder="z. B. Authentifizierung erforderlich, spezielle Feldbezeichnungen, Bildqualität 800×800px..." />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 4: Vertrag & Rechtliches ── */}
        {step === 4 && (
          <div className="card border-0 shadow-sm p-4">
            <h4 className="fw-bold mb-1" style={{ color: "var(--pg-blue)" }}>
              <i className="bi bi-file-earmark-text me-2" />Vertrag & Rechtliches
            </h4>
            <p className="text-muted small mb-4">
              Bitte lesen und bestätigen Sie alle rechtlichen Dokumente vor der Unterzeichnung.
            </p>

            {/* Vertragskonditionen */}
            <div className="card bg-light border-0 p-3 mb-4">
              <h6 className="fw-bold mb-2">Vertragskonditionen (Zusammenfassung)</h6>
              <ul className="small mb-0 text-muted">
                <li className="mb-1">Vertragslaufzeit: <strong>12 Monate</strong>, danach jährliche Verlängerung</li>
                <li className="mb-1">Kündigungsfrist: <strong>3 Monate</strong> zum Vertragsende</li>
                <li className="mb-1">Zahlungsziel: <strong>30 Tage netto</strong> nach Rechnungsstellung</li>
                <li className="mb-1">Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer</li>
                <li className="mb-1">Preisgucken behält sich das Recht vor, Produkte bei Qualitätsverstößen zu deaktivieren</li>
                <li className="mb-1">Gerichtsstand: <strong>München, Deutschland</strong></li>
                <li>Anwendbares Recht: <strong>Deutsches Recht</strong></li>
              </ul>
            </div>

            {/* Zahlungsmodell */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <Field label="Gewünschtes Vergütungsmodell">
                  <select className="form-select" value={form.provisionModell}
                    onChange={(e) => set("provisionModell", e.target.value)}>
                    <option value="">– bitte wählen –</option>
                    <option value="cpc">CPC – Kosten pro Klick</option>
                    <option value="cpa">CPA – Provision pro Verkauf (%)</option>
                    <option value="flat">Monatliche Pauschale</option>
                  </select>
                </Field>
              </div>
              {form.provisionModell === "cpa" && (
                <div className="col-md-6">
                  <Field label="Gewünschter Provisionssatz (%)"
                    hint="Üblich: 3–15% je nach Kategorie">
                    <input className="form-control" type="number" min={1} max={50}
                      value={form.provisionSatz}
                      onChange={(e) => set("provisionSatz", e.target.value)}
                      placeholder="z. B. 8" />
                  </Field>
                </div>
              )}
            </div>

            {/* Rechtliche Bestätigungen */}
            <h6 className="fw-bold mb-3">Zustimmungen & Akzeptanz</h6>

            {[
              {
                field: "agbGelesen",
                label: <>Ich habe die <a href="/agb" target="_blank" style={{ color: "var(--pg-blue)" }}>Allgemeinen Geschäftsbedingungen (AGB)</a> gelesen und akzeptiere diese.</>,
                required: true,
              },
              {
                field: "datenschutzGelesen",
                label: <>Ich habe die <a href="/datenschutz" target="_blank" style={{ color: "var(--pg-blue)" }}>Datenschutzerklärung</a> gelesen und stimme der Verarbeitung meiner Unternehmensdaten gemäß DSGVO zu.</>,
                required: true,
              },
              {
                field: "avvAkzeptiert",
                label: <>Ich akzeptiere den <strong>Auftragsverarbeitungsvertrag (AVV)</strong> gemäß Art. 28 DSGVO für die Verarbeitung von Kundendaten im Rahmen der Zusammenarbeit.</>,
                required: true,
              },
              {
                field: "wettbewerbsklauselAkzeptiert",
                label: <>Ich bestätige, dass die angebotenen Produkte und Preise auch auf preisgucken.de veröffentlicht werden dürfen und keine exklusiven Plattform-Beschränkungen bestehen.</>,
                required: false,
              },
              {
                field: "qualitaetsrichtlinienAkzeptiert",
                label: <>Ich habe die <strong>Qualitätsrichtlinien für Produktdaten</strong> gelesen und verpflichte mich, Produkttitel, Beschreibungen und Bilder in der geforderten Qualität zu liefern.</>,
                required: true,
              },
            ].map(({ field, label, required }) => (
              <div key={field} className="mb-3">
                <div className="form-check">
                  <input
                    className={`form-check-input ${errors[field] ? "is-invalid" : ""}`}
                    type="checkbox"
                    id={field}
                    checked={form[field]}
                    onChange={(e) => set(field, e.target.checked)}
                  />
                  <label className="form-check-label small" htmlFor={field}>
                    {required && <span className="text-danger me-1">*</span>}
                    {label}
                  </label>
                </div>
                {errors[field] && <div className="text-danger ms-4" style={{ fontSize: "0.78rem" }}>{errors[field]}</div>}
              </div>
            ))}

            {/* Elektronische Unterschrift */}
            <div className="card border-warning bg-warning bg-opacity-10 p-3 mt-4">
              <h6 className="fw-bold mb-3">
                <i className="bi bi-pen me-2" />Elektronische Unterzeichnung
              </h6>
              <p className="small text-muted mb-3">
                Mit Ihrer Unterschrift (Vor- und Nachname) bestätigen Sie, bevollmächtigt zu sein,
                diesen Vertrag im Namen des oben genannten Unternehmens abzuschließen.
              </p>
              <div className="row g-3">
                <div className="col-md-5">
                  <Field label="Vor- und Nachname (Unterschrift)" required error={errors.unterschriftName}>
                    <input className={`form-control ${errors.unterschriftName ? "is-invalid" : ""}`}
                      value={form.unterschriftName}
                      onChange={(e) => set("unterschriftName", e.target.value)}
                      placeholder="Max Mustermann" />
                  </Field>
                </div>
                <div className="col-md-4">
                  <Field label="Ort" required error={errors.unterschriftOrt}>
                    <input className={`form-control ${errors.unterschriftOrt ? "is-invalid" : ""}`}
                      value={form.unterschriftOrt}
                      onChange={(e) => set("unterschriftOrt", e.target.value)}
                      placeholder="München" />
                  </Field>
                </div>
                <div className="col-md-3">
                  <Field label="Datum" required error={errors.unterschriftDatum}>
                    <input className={`form-control ${errors.unterschriftDatum ? "is-invalid" : ""}`}
                      type="date" value={form.unterschriftDatum}
                      onChange={(e) => set("unterschriftDatum", e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            <div className="alert alert-info mt-4 small mb-0">
              <i className="bi bi-info-circle me-2" />
              Nach dem Absenden erhalten Sie eine Bestätigungs-E-Mail. Unser B2B-Team meldet sich
              innerhalb von <strong>2 Werktagen</strong> bei Ihnen. Der Vertrag wird erst nach
              schriftlicher Bestätigung beider Seiten wirksam.
            </div>
          </div>
        )}

        {/* ── Navigation buttons ── */}
        <div className="d-flex justify-content-between mt-4">
          {step > 0 ? (
            <button className="btn btn-outline-secondary" onClick={back}>
              <i className="bi bi-arrow-left me-2" />Zurück
            </button>
          ) : (
            <a href="/" className="btn btn-outline-secondary">
              <i className="bi bi-x me-2" />Abbrechen
            </a>
          )}

          {step < STEPS.length - 1 ? (
            <button
              className="btn fw-semibold px-4"
              style={{ background: "var(--pg-blue)", color: "#fff" }}
              onClick={next}
            >
              Weiter <i className="bi bi-arrow-right ms-2" />
            </button>
          ) : (
            <button
              className="btn fw-semibold px-5"
              style={{ background: "#2d7a3a", color: "#fff" }}
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <><span className="spinner-border spinner-border-sm me-2" />Wird gesendet…</>
              ) : (
                <><i className="bi bi-send-check me-2" />Jetzt verbindlich registrieren</>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-muted mt-3" style={{ fontSize: "0.75rem" }}>
          Schritt {step + 1} von {STEPS.length} · Alle mit <span className="text-danger">*</span> markierten Felder sind Pflichtfelder
        </p>
      </div>
    </div>
  );
}
