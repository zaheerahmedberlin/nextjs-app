"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const OUR_FIELDS = [
  { key: "title",       label: "Titel",        required: true  },
  { key: "price",       label: "Preis",        required: true  },
  { key: "url",         label: "Produkt-URL",  required: true  },
  { key: "image",       label: "Bild-URL",     required: false },
  { key: "description", label: "Beschreibung", required: false },
  { key: "old_price",   label: "Alter Preis",  required: false },
  { key: "ean",         label: "EAN",          required: false },
  { key: "in_stock",    label: "Auf Lager",    required: false },
  { key: "category",    label: "Kategorie",    required: false },
  { key: "external_id", label: "Artikel-Nr.",  required: false },
];

export default function VendorUploadPage() {
  const router  = useRouter();
  const fileRef = useRef(null);

  const [step, setStep]           = useState("pick");   // pick | mapping | done
  const [file, setFile]           = useState(null);
  const [dragging, setDragging]   = useState(false);
  const [headers, setHeaders]     = useState([]);
  const [mapping, setMapping]     = useState({});       // { vendorCol: ourField }
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [uploadId, setUploadId]   = useState(null);

  // ── Step 1: pick file ───────────────────────────────────────

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }

  async function handleFileSelect(e) {
    const f = e.target.files[0];
    if (f) setFile(f);
  }

  async function handlePreview() {
    if (!file) return;
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/vendor/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }

      setHeaders(data.headers);

      // Pre-fill from saved mapping if available
      const initial = {};
      data.headers.forEach(h => {
        if (data.savedMapping?.[h]) {
          initial[h] = data.savedMapping[h];
        } else {
          // Auto-match by common German synonyms
          initial[h] = autoMatch(h);
        }
      });
      setMapping(initial);
      setStep("mapping");
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: mapping UI ──────────────────────────────────────

  function setFieldForCol(vendorCol, ourField) {
    setMapping(m => ({ ...m, [vendorCol]: ourField }));
  }

  const requiredMapped = OUR_FIELDS
    .filter(f => f.required)
    .every(f => Object.values(mapping).includes(f.key));

  async function handleConfirm() {
    if (!requiredMapped) {
      setError("Bitte alle Pflichtfelder zuordnen (Titel, Preis, Produkt-URL).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mapping", JSON.stringify(mapping));
      const res  = await fetch("/api/vendor/upload/confirm", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setUploadId(data.uploadId);
      setStep("done");
    } catch {
      setError("Netzwerkfehler – bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  if (step === "done") {
    return (
      <div className="container py-5" style={{ maxWidth: 600 }}>
        <div className="card border-0 shadow-sm text-center p-5">
          <div style={{ fontSize: 48 }}>✅</div>
          <h4 className="mt-3 fw-bold">Datei empfangen!</h4>
          <p className="text-muted">
            Wir verarbeiten Ihre Produkte im Hintergrund.<br />
            Upload-ID: <code>{uploadId}</code>
          </p>
          <div className="d-flex gap-2 justify-content-center mt-3">
            <button className="btn btn-outline-secondary" onClick={() => { setStep("pick"); setFile(null); }}>
              Weitere Datei hochladen
            </button>
            <button className="btn btn-primary" onClick={() => router.push("/vendor/dashboard")}>
              Zum Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "mapping") {
    return (
      <div className="container py-4" style={{ maxWidth: 700 }}>
        <h4 className="fw-bold mb-1">Spalten zuordnen</h4>
        <p className="text-muted small mb-4">
          Ordnen Sie Ihre Dateispalten unseren Feldern zu. Pflichtfelder sind mit * markiert.
          Diese Zuordnung wird gespeichert – beim nächsten Upload automatisch vorausgefüllt.
        </p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            <table className="table mb-0">
              <thead className="table-light">
                <tr>
                  <th className="ps-3 py-3">Ihre Spalte</th>
                  <th className="py-3">→ Unser Feld</th>
                </tr>
              </thead>
              <tbody>
                {headers.map(h => (
                  <tr key={h}>
                    <td className="ps-3 align-middle">
                      <code className="text-dark">{h}</code>
                    </td>
                    <td className="align-middle pe-3">
                      <select
                        className="form-select form-select-sm"
                        value={mapping[h] || "__ignore__"}
                        onChange={e => setFieldForCol(h, e.target.value)}
                      >
                        <option value="__ignore__">— ignorieren —</option>
                        {OUR_FIELDS.map(f => (
                          <option key={f.key} value={f.key}>
                            {f.label}{f.required ? " *" : ""}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="d-flex gap-2 mt-4">
          <button className="btn btn-outline-secondary" onClick={() => setStep("pick")}>
            Zurück
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={loading || !requiredMapped}
          >
            {loading ? "Wird hochgeladen…" : "Hochladen & verarbeiten"}
          </button>
        </div>
        {!requiredMapped && (
          <p className="text-danger small mt-2">
            Titel *, Preis * und Produkt-URL * müssen zugeordnet sein.
          </p>
        )}
      </div>
    );
  }

  // step === "pick"
  return (
    <div className="container py-4" style={{ maxWidth: 600 }}>
      <h4 className="fw-bold mb-1">Produkte hochladen</h4>
      <p className="text-muted small mb-4">CSV oder Excel-Datei, max. 50 MB</p>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      <div
        className={`border rounded p-5 text-center ${dragging ? "border-primary bg-primary bg-opacity-10" : "border-dashed"}`}
        style={{ cursor: "pointer", borderStyle: "dashed" }}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <div style={{ fontSize: 36 }}>📂</div>
        {file ? (
          <>
            <p className="fw-semibold mb-1 mt-2">{file.name}</p>
            <p className="text-muted small">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </>
        ) : (
          <>
            <p className="fw-semibold mb-1 mt-2">Datei hierher ziehen</p>
            <p className="text-muted small">oder klicken zum Auswählen</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="d-none"
          onChange={handleFileSelect}
        />
      </div>

      <div className="mt-3 d-flex gap-2">
        <a href="/vendor/template.csv" download className="btn btn-outline-secondary btn-sm">
          Vorlage herunterladen (.csv)
        </a>
        <button
          className="btn btn-primary"
          disabled={!file || loading}
          onClick={handlePreview}
        >
          {loading ? "Wird gelesen…" : "Weiter → Spalten zuordnen"}
        </button>
      </div>
    </div>
  );
}

// ── Auto-match vendor column names to our fields ──────────────
function autoMatch(col) {
  const c = col.toLowerCase().trim();
  if (/titel|name|bezeichnung|artikel/.test(c)) return "title";
  if (/preis|price|eur|euro/.test(c) && !/alt|old|streich/.test(c)) return "price";
  if (/alter.preis|old.price|streichpreis|uvp/.test(c)) return "old_price";
  if (/url|link|produkt.link/.test(c) && !/bild|image|foto/.test(c)) return "url";
  if (/bild|image|foto|img/.test(c)) return "image";
  if (/beschreibung|description|text/.test(c)) return "description";
  if (/ean|barcode|gtin/.test(c)) return "ean";
  if (/lager|stock|verfügbar|available/.test(c)) return "in_stock";
  if (/kategorie|category|gruppe/.test(c)) return "category";
  if (/artikel.nr|sku|id|extern/.test(c)) return "external_id";
  return "__ignore__";
}
