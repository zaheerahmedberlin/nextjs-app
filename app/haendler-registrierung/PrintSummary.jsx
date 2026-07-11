"use client";

export default function PrintSummary({ form }) {
  const ref_nr = `PG-B2B-${Date.now().toString(36).toUpperCase()}`;
  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit", month: "long", year: "numeric",
  });

  function Section({ title, children }) {
    return (
      <div className="pg-section">
        <div className="pg-section-title">{title}</div>
        <table className="pg-table">
          <tbody>{children}</tbody>
        </table>
      </div>
    );
  }

  function Row({ label, value }) {
    if (!value && value !== false) return null;
    return (
      <tr>
        <td className="pg-label">{label}</td>
        <td className="pg-value">{String(value)}</td>
      </tr>
    );
  }

  const PREISMODELL_LABEL = {
    cpc: "CPC – Cost per Click",
    cpa: "CPA – Provision pro Verkauf",
    flat: "Monatliche Pauschale",
    free: "Kostenlos (Basis-Listing)",
  };

  const INTEGRATION_LABEL = {
    feed: "Produkt-Feed (CSV / XML / JSON)",
    api: "API-Anbindung (REST)",
    upload: "Manueller Datei-Upload",
    scraping: "Web-Scraping durch Preisgucken",
  };

  return (
    <>
      <style>{`
        /* ── Print-only document styles ── */
        .pg-print-doc {
          font-family: 'Georgia', serif;
          font-size: 11pt;
          color: #111;
          line-height: 1.5;
          max-width: 800px;
          margin: 0 auto;
          padding: 0;
        }
        .pg-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 3px solid #1A3A6B;
          padding-bottom: 12px;
          margin-bottom: 20px;
        }
        .pg-header-logo { font-size: 22pt; font-weight: bold; color: #1A3A6B; }
        .pg-header-meta { text-align: right; font-size: 9pt; color: #555; }
        .pg-doc-title {
          font-size: 16pt;
          font-weight: bold;
          color: #1A3A6B;
          margin: 0 0 4px;
        }
        .pg-doc-subtitle { font-size: 10pt; color: #555; margin: 0 0 24px; }
        .pg-section { margin-bottom: 18px; }
        .pg-section-title {
          background: #1A3A6B;
          color: #fff;
          font-family: Arial, sans-serif;
          font-size: 10pt;
          font-weight: bold;
          padding: 5px 10px;
          margin-bottom: 0;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .pg-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
        }
        .pg-table tr:nth-child(even) { background: #f5f8ff; }
        .pg-label {
          padding: 5px 10px;
          color: #444;
          font-style: italic;
          width: 38%;
          border: 1px solid #d5dff5;
          vertical-align: top;
        }
        .pg-value {
          padding: 5px 10px;
          font-weight: 500;
          border: 1px solid #d5dff5;
          vertical-align: top;
        }
        .pg-legal-box {
          border: 2px solid #1A3A6B;
          border-radius: 4px;
          padding: 14px 16px;
          margin-bottom: 18px;
          font-size: 9.5pt;
          background: #f9fafe;
        }
        .pg-legal-box h4 {
          color: #1A3A6B;
          font-size: 11pt;
          margin: 0 0 10px;
        }
        .pg-legal-box ul { margin: 0; padding-left: 18px; }
        .pg-legal-box li { margin-bottom: 4px; }
        .pg-check { color: #2d7a3a; font-weight: bold; }
        .pg-signature-box {
          border: 1px solid #aaa;
          padding: 16px;
          margin-top: 20px;
          background: #fffdf5;
        }
        .pg-signature-line {
          display: flex;
          gap: 24px;
          margin-top: 16px;
        }
        .pg-sig-field {
          flex: 1;
          border-bottom: 1px solid #333;
          padding-bottom: 4px;
          font-size: 10pt;
        }
        .pg-sig-label {
          font-size: 8pt;
          color: #666;
          margin-top: 3px;
        }
        .pg-sig-value {
          font-size: 11pt;
          font-weight: bold;
          color: #1A3A6B;
          min-height: 22px;
        }
        .pg-footer {
          margin-top: 28px;
          border-top: 1px solid #ccc;
          padding-top: 8px;
          font-size: 8pt;
          color: #888;
          display: flex;
          justify-content: space-between;
        }
        .pg-ref { font-weight: bold; color: #1A3A6B; }

        /* ── Screen: hide print doc behind button ── */
        .pg-print-wrapper { display: none; }
        .pg-print-wrapper.show { display: block; }

        /* ── @media print: show only the doc ── */
        @media print {
          body > * { display: none !important; }
          .pg-print-portal { display: block !important; }
          .pg-print-portal * { display: revert !important; }
          .pg-print-wrapper { display: block !important; }
          .pg-no-print { display: none !important; }
          @page {
            size: A4;
            margin: 18mm 15mm 15mm 15mm;
          }
        }
      `}</style>

      <div className="pg-print-doc pg-print-wrapper show" id="pg-print-doc">
        {/* Header */}
        <div className="pg-header">
          <div>
            <div className="pg-header-logo">preis<span style={{ color: "#F5A623" }}>gucken</span>.de</div>
            <div style={{ fontSize: "9pt", color: "#555" }}>Händler-Partnervertrag</div>
          </div>
          <div className="pg-header-meta">
            <div><strong>Ref.-Nr.:</strong> <span className="pg-ref">{ref_nr}</span></div>
            <div><strong>Datum:</strong> {today}</div>
            <div><strong>Status:</strong> Eingereicht – in Prüfung</div>
          </div>
        </div>

        <p className="pg-doc-title">Händler-Registrierung & Partnervertrag</p>
        <p className="pg-doc-subtitle">
          Antrag auf Listung von Produkten auf Preisgucken.de – Preisvergleich für Deutschland
        </p>

        {/* 1. Unternehmensdaten */}
        <Section title="1. Unternehmensdaten">
          <Row label="Firmenname" value={form.firmenname} />
          <Row label="Rechtsform" value={form.rechtsform} />
          <Row label="USt-IdNr." value={form.ustIdNr} />
          <Row label="Handelsregisternr." value={form.handelsregisterNr || "–"} />
          <Row label="Registergericht" value={form.handelsregisterGericht || "–"} />
          <Row label="Anschrift (Sitz)" value={`${form.strasse}, ${form.plz} ${form.ort}, ${form.land}`} />
          {form.hauptniederlassungAbweichend && (
            <Row label="Hauptniederlassung" value={`${form.hauptniederlassungStrasse}, ${form.hauptniederlassungPlz} ${form.hauptniederlassungOrt}, ${form.hauptniederlassungLand}`} />
          )}
          <Row label="Website / Shop" value={form.website} />
          <Row label="Gründungsjahr" value={form.gruendungsjahr || "–"} />
          <Row label="Mitarbeiter" value={form.mitarbeiteranzahl || "–"} />
          <Row label="Jahresumsatz" value={form.jahresumsatz || "–"} />
        </Section>

        {/* 2. Ansprechpartner */}
        <Section title="2. Kaufmännischer Ansprechpartner">
          <Row label="Name" value={`${form.anredeKontakt} ${form.vornameKontakt} ${form.nachnameKontakt}`.trim()} />
          <Row label="Position" value={form.positionKontakt} />
          <Row label="E-Mail" value={form.emailKontakt} />
          <Row label="Telefon" value={form.telefonKontakt} />
        </Section>

        {(form.vornameTech || form.emailTech) && (
          <Section title="2b. Technischer Ansprechpartner">
            <Row label="Name" value={`${form.anredeTech || ""} ${form.vornameTech || ""} ${form.nachnameTech || ""}`.trim() || "–"} />
            <Row label="E-Mail" value={form.emailTech || "–"} />
            <Row label="Telefon" value={form.telefonTech || "–"} />
          </Section>
        )}

        {/* 3. Produktkatalog */}
        <Section title="3. Produktkatalog">
          <Row label="Kategorien" value={form.kategorien?.join(", ") || "–"} />
          <Row label="Produktanzahl (ca.)" value={form.produktanzahl} />
          <Row label="Preisspanne" value={form.mindestpreis || form.hoechstpreis ? `${form.mindestpreis || "–"} € – ${form.hoechstpreis || "–"} €` : "–"} />
          <Row label="Preismodell" value={PREISMODELL_LABEL[form.preismodell] || form.preismodell} />
          <Row label="Feed-Aktualisierung" value={form.updateFrequenz} />
          <Row label="Versandländer" value={form.versandlaender?.join(", ") || "–"} />
          <Row label="Rückgaberecht" value={form.rueckgaberecht || "–"} />
          <Row label="Sortimentsbeschreibung" value={form.produktbeschreibung || "–"} />
        </Section>

        {/* 4. Technische Integration */}
        <Section title="4. Technische Integration">
          <Row label="Methode" value={INTEGRATION_LABEL[form.integrationsmethode] || form.integrationsmethode} />
          <Row label="Feed-URL" value={form.feedUrl || "–"} />
          <Row label="Format" value={form.feedFormat || "–"} />
          <Row label="Update-Intervall" value={form.feedUpdateIntervall || "–"} />
          <Row label="API-Dokumentation" value={form.apiVerfuegbar || "–"} />
          <Row label="Test-Zugang" value={form.testZugang || "–"} />
          <Row label="Anmerkungen" value={form.technischeAnmerkungen || "–"} />
        </Section>

        {/* 5. Vertragskonditionen */}
        <div className="pg-legal-box">
          <h4>5. Vertragskonditionen (Zusammenfassung)</h4>
          <ul>
            <li>Vertragslaufzeit: <strong>12 Monate</strong>, danach jährliche automatische Verlängerung</li>
            <li>Kündigungsfrist: <strong>3 Monate</strong> zum Vertragsende in Textform</li>
            <li>Zahlungsziel: <strong>30 Tage netto</strong> nach Rechnungsstellung</li>
            <li>Vergütungsmodell: <strong>{PREISMODELL_LABEL[form.provisionModell] || form.provisionModell || "Gemäß separater Vereinbarung"}</strong>
              {form.provisionSatz ? ` (${form.provisionSatz} %)` : ""}</li>
            <li>Alle Preise verstehen sich zzgl. der gesetzlichen Mehrwertsteuer (19 %)</li>
            <li>Gerichtsstand und Erfüllungsort: <strong>München, Deutschland</strong></li>
            <li>Anwendbares Recht: <strong>Deutsches Recht</strong> unter Ausschluss des UN-Kaufrechts</li>
            <li>Preisgucken.de behält sich das Recht vor, Produkte bei Qualitätsverstößen ohne Vorankündigung zu deaktivieren</li>
          </ul>
        </div>

        {/* 6. Zustimmungen */}
        <Section title="6. Rechtliche Zustimmungen">
          <Row label="AGB akzeptiert" value={form.agbGelesen ? "✓ Ja" : "✗ Nein"} />
          <Row label="Datenschutzerklärung (DSGVO)" value={form.datenschutzGelesen ? "✓ Ja" : "✗ Nein"} />
          <Row label="Auftragsverarbeitungsvertrag (AVV, Art. 28 DSGVO)" value={form.avvAkzeptiert ? "✓ Ja" : "✗ Nein"} />
          <Row label="Qualitätsrichtlinien" value={form.qualitaetsrichtlinienAkzeptiert ? "✓ Ja" : "✗ Nein"} />
          <Row label="Wettbewerbsklausel" value={form.wettbewerbsklauselAkzeptiert ? "✓ Ja" : "Keine Angabe"} />
        </Section>

        {/* Signature */}
        <div className="pg-signature-box">
          <strong style={{ fontSize: "11pt" }}>7. Elektronische Unterzeichnung</strong>
          <p style={{ fontSize: "9pt", color: "#555", marginTop: 6, marginBottom: 14 }}>
            Der Unterzeichner bestätigt, bevollmächtigt zu sein, diesen Vertrag im Namen des
            oben genannten Unternehmens rechtswirksam abzuschließen. Diese elektronische
            Unterzeichnung gilt gemäß § 126b BGB als Textform.
          </p>
          <div className="pg-signature-line">
            <div className="pg-sig-field">
              <div className="pg-sig-value">{form.firmenname}</div>
              <div className="pg-sig-label">Unternehmen</div>
            </div>
            <div className="pg-sig-field">
              <div className="pg-sig-value" style={{ fontStyle: "italic", fontFamily: "Georgia, serif", fontSize: "13pt" }}>
                {form.unterschriftName}
              </div>
              <div className="pg-sig-label">Unterzeichner (Name)</div>
            </div>
            <div className="pg-sig-field">
              <div className="pg-sig-value">{form.unterschriftOrt}, {form.unterschriftDatum ? new Date(form.unterschriftDatum).toLocaleDateString("de-DE") : ""}</div>
              <div className="pg-sig-label">Ort, Datum</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pg-footer">
          <span>Preisgucken.de · b2b@preisgucken.de · www.preisgucken.de</span>
          <span>Ref.: <strong>{ref_nr}</strong> · Erstellt: {today}</span>
        </div>

        <p style={{ fontSize: "8pt", color: "#aaa", marginTop: 10, textAlign: "center" }}>
          Dieser Vertrag wird erst nach schriftlicher Bestätigung durch Preisgucken.de rechtswirksam.
          Eine Kopie dieses Dokuments wird an {form.emailKontakt} gesendet.
        </p>
      </div>
    </>
  );
}
