"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_BADGE = {
  pending:    { label: "Warten auf Freigabe", cls: "bg-secondary" },
  processing: { label: "Verarbeitung…",       cls: "bg-warning text-dark" },
  done:       { label: "Fertig",              cls: "bg-success" },
  error:      { label: "Fehler",              cls: "bg-danger" },
  rejected:   { label: "Abgelehnt",           cls: "bg-danger" },
};

const STEPS_DE = [
  { icon: "⬇️", title: "Vorlage herunterladen", desc: "Laden Sie unsere CSV-Vorlage herunter und öffnen Sie sie in Excel." },
  { icon: "✏️", title: "Datei ausfüllen",        desc: "Tragen Sie Ihre Produkte ein. Titel, Preis und URL sind Pflichtfelder." },
  { icon: "📤", title: "Datei hochladen",        desc: "Laden Sie Ihre CSV- oder Excel-Datei hoch (max. 50 MB)." },
  { icon: "🔗", title: "Spalten zuordnen",       desc: "Ordnen Sie Ihre Spalten unseren Feldern zu — wird für künftige Uploads gespeichert." },
  { icon: "⚙️", title: "Verarbeitung abwarten",  desc: "Ihre Produkte werden im Hintergrund verarbeitet. Status unten einsehbar." },
];

const STEPS_EN = [
  { icon: "⬇️", title: "Download template",  desc: "Download our CSV template and open it in Excel." },
  { icon: "✏️", title: "Fill in your data",  desc: "Add your products. Title, Price, and URL are required fields." },
  { icon: "📤", title: "Upload the file",    desc: "Upload your CSV or Excel file (max. 50 MB)." },
  { icon: "🔗", title: "Map your columns",   desc: "Match your column names to our fields — saved for future uploads automatically." },
  { icon: "⚙️", title: "Wait for processing", desc: "Products are processed in the background. Track the status in the table below." },
];

export default function VendorDashboard() {
  const router  = useRouter();
  const [uploads, setUploads] = useState([]);
  const [vendorInfo, setVendorInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetchUploads();
    const id = setInterval(() => {
      if (uploads.some(u => u.status === "pending" || u.status === "processing")) {
        fetchUploads();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [uploads.length]);

  async function fetchUploads() {
    try {
      const res = await fetch("/api/vendor/uploads");
      if (res.status === 401) { router.push("/vendor/login"); return; }
      const data = await res.json();
      setUploads(data.uploads || []);
      if (data.vendor) setVendorInfo(data.vendor);
    } catch {
      setError("Ladefehler");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/vendor/auth", { method: "DELETE" });
    router.push("/vendor/login");
  }

  const totalProducts  = uploads.reduce((s, u) => s + (u.processed_rows || 0), 0);
  const totalUploads   = uploads.length;
  const lastUpload     = uploads[0];

  return (
    <div style={{ minHeight: "100vh", background: "#f0f4f8" }}>

      {/* Top navbar */}
      <nav className="navbar bg-white shadow-sm px-4 py-3">
        <div className="d-flex align-items-center gap-3">
          <img src="/preis-gucken-logo.png" alt="Preisgucken" style={{ height: 40 }} />
          <div>
            <div className="fw-bold" style={{ color: "var(--pg-blue)", fontSize: 18 }}>Händler-Portal</div>
            {vendorInfo && <div className="text-muted small">{vendorInfo.name}</div>}
          </div>
        </div>
        <div className="d-flex gap-2 ms-auto">
          <Link href="/vendor/upload" className="btn btn-primary btn-sm px-3">
            ＋ Produkte hochladen
          </Link>
          <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>Abmelden</button>
        </div>
      </nav>

      <div className="container py-4" style={{ maxWidth: 1100 }}>

        {/* Pending approval banner */}
        {uploads.some(u => u.status === "pending") && (
          <div className="alert alert-warning d-flex align-items-center gap-2 mb-4 py-2">
            <span>⏳</span>
            <span className="small">
              <strong>Freigabe ausstehend / Awaiting approval</strong> — Ihr Upload wird von unserem Team geprüft und bald verarbeitet.
            </span>
          </div>
        )}

        {/* Stats row */}
        <div className="row g-3 mb-4">
          {[
            { label: "Gesamt Uploads",   labelEn: "Total Uploads",   value: totalUploads,  icon: "📁", color: "#4f8ef7" },
            { label: "Produkte importiert", labelEn: "Products imported", value: totalProducts.toLocaleString("de-DE"), icon: "📦", color: "#28a745" },
            { label: "Letzter Upload",   labelEn: "Last Upload",
              value: lastUpload ? new Date(lastUpload.created_at).toLocaleDateString("de-DE") : "—",
              icon: "🕒", color: "#fd7e14" },
            { label: "Status",           labelEn: "Status",
              value: lastUpload
                ? (lastUpload.status === "done"       ? "✅ Fertig"
                :  lastUpload.status === "processing" ? "⏳ Verarbeitung…"
                :  lastUpload.status === "error"      ? "❌ Fehler"
                :                                       "⏸ Ausstehend")
                : "—",
              icon: "📊", color: lastUpload?.status === "done" ? "#28a745" : lastUpload?.status === "error" ? "#dc3545" : "#fd7e14" },
          ].map((s, i) => (
            <div className="col-6 col-md-3" key={i}>
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <div>
                      <div className="small text-muted">{s.label}</div>
                      <div className="x-small text-muted" style={{ fontSize: 10 }}>{s.labelEn}</div>
                    </div>
                  </div>
                  <div className="fw-bold fs-5" style={{ color: s.color }}>{s.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Step-by-step guide */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="row g-4">

              {/* German */}
              <div className="col-md-6">
                <h6 className="fw-bold mb-3" style={{ color: "var(--pg-blue)" }}>🇩🇪 So laden Sie Ihre Produkte hoch</h6>
                <div className="d-flex flex-column gap-3">
                  {STEPS_DE.map((s, i) => (
                    <div key={i} className="d-flex gap-3 align-items-start">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 36, height: 36, background: "#e8f0fe", fontSize: 16 }}>
                        {s.icon}
                      </div>
                      <div>
                        <div className="fw-semibold small">{i + 1}. {s.title}</div>
                        <div className="text-muted small">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-muted small mt-3 mb-0">
                  Fragen? <a href="mailto:support@preisgucken.de">support@preisgucken.de</a>
                </p>
              </div>

              {/* English */}
              <div className="col-md-6" style={{ borderLeft: "1px solid #e9ecef" }}>
                <h6 className="fw-bold mb-3" style={{ color: "var(--pg-blue)" }}>🇬🇧 How to upload your products</h6>
                <div className="d-flex flex-column gap-3">
                  {STEPS_EN.map((s, i) => (
                    <div key={i} className="d-flex gap-3 align-items-start">
                      <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 36, height: 36, background: "#e8f0fe", fontSize: 16 }}>
                        {s.icon}
                      </div>
                      <div>
                        <div className="fw-semibold small">{i + 1}. {s.title}</div>
                        <div className="text-muted small">{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-muted small mt-3 mb-0">
                  Questions? <a href="mailto:support@preisgucken.de">support@preisgucken.de</a>
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Upload history */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-bold mb-0" style={{ color: "var(--pg-blue)" }}>Upload-Verlauf / Upload History</h6>
          <Link href="/vendor/upload" className="btn btn-outline-primary btn-sm">+ Neuer Upload</Link>
        </div>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        {loading ? (
          <div className="text-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2" />
            Wird geladen…
          </div>
        ) : uploads.length === 0 ? (
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center py-5">
              <div style={{ fontSize: 48 }}>📭</div>
              <p className="fw-semibold mt-3 mb-1">Noch keine Uploads / No uploads yet</p>
              <p className="text-muted small mb-3">Laden Sie Ihre erste Produktdatei hoch, um zu beginnen.</p>
              <Link href="/vendor/upload" className="btn btn-primary">Ersten Upload starten</Link>
            </div>
          </div>
        ) : (
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead style={{ background: "#f8f9fa" }}>
                  <tr>
                    <th className="ps-3 py-3 small text-muted fw-semibold">Dateiname</th>
                    <th className="py-3 small text-muted fw-semibold">Status</th>
                    <th className="py-3 small text-muted fw-semibold">Gesamt</th>
                    <th className="py-3 small text-muted fw-semibold text-success">Importiert</th>
                    <th className="py-3 small text-muted fw-semibold text-warning">Übersprungen</th>
                    <th className="py-3 small text-muted fw-semibold">Hochgeladen</th>
                    <th className="py-3 small text-muted fw-semibold">Abgeschlossen</th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(u => {
                    const badge = STATUS_BADGE[u.status] || STATUS_BADGE.pending;
                    const pct   = u.total_rows ? Math.round((u.processed_rows / u.total_rows) * 100) : null;
                    return (
                      <tr key={u.id}>
                        <td className="ps-3">
                          <div className="fw-semibold small">📄 {u.original_name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {u.file_size ? (u.file_size / 1024).toFixed(0) + " KB" : "—"}
                          </div>
                        </td>
                        <td>
                          <span className={`badge rounded-pill ${badge.cls}`}>{badge.label}</span>
                          {u.status === "processing" && pct !== null && (
                            <div className="progress mt-1" style={{ height: 4, width: 80 }}>
                              <div className="progress-bar bg-warning" style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </td>
                        <td className="small">{u.total_rows ?? "—"}</td>
                        <td className="small fw-semibold text-success">{u.processed_rows ?? "—"}</td>
                        <td className="small text-warning">{u.skipped_rows ?? "—"}</td>
                        <td className="small text-muted">{new Date(u.created_at).toLocaleString("de-DE")}</td>
                        <td className="small text-muted">
                          {u.completed_at ? new Date(u.completed_at).toLocaleString("de-DE") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {uploads.filter(u => u.status === "error" && u.error_log).map(u => (
          <div key={u.id} className="alert alert-danger mt-3 small">
            <strong>⚠️ {u.original_name}:</strong> {u.error_log}
          </div>
        ))}
      </div>
    </div>
  );
}
