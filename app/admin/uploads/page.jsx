"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STATUS_BADGE = {
  pending:    { label: "Ausstehend",    cls: "bg-secondary" },
  processing: { label: "Verarbeitung…", cls: "bg-warning text-dark" },
  done:       { label: "Fertig",        cls: "bg-success" },
  error:      { label: "Fehler",        cls: "bg-danger" },
  rejected:   { label: "Abgelehnt",    cls: "bg-danger" },
};

export default function AdminUploads() {
  const router = useRouter();
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing]   = useState(null); // upload id being acted on

  useEffect(() => {
    loadUploads();
  }, []);

  async function loadUploads() {
    const res = await fetch("/api/admin/uploads");
    if (res.status === 401) { router.push("/admin/login"); return; }
    const data = await res.json();
    setUploads(data.uploads || []);
    setLoading(false);
  }

  async function approve(id) {
    setActing(id);
    await fetch(`/api/admin/uploads/${id}/approve`, { method: "POST" });
    await loadUploads();
    setActing(null);
  }

  async function reject(id) {
    setActing(id);
    await fetch(`/api/admin/uploads/${id}/approve`, { method: "DELETE" });
    await loadUploads();
    setActing(null);
  }

  const pending = uploads.filter(u => u.status === "pending");

  return (
    <div style={{ minHeight: "100vh", background: "var(--pg-blue-light)" }}>
      <nav className="navbar bg-white shadow-sm px-4">
        <img src="/preis-gucken-logo.png" alt="Preisgucken" style={{ height: 48 }} />
        <div className="ms-3 d-flex gap-3">
          <a href="/admin/billing"  className="btn btn-sm btn-outline-secondary">Billing</a>
          <a href="/admin/vendors"  className="btn btn-sm btn-outline-secondary">Vendors</a>
          <a href="/admin/uploads"  className="btn btn-sm btn-primary">Uploads</a>
        </div>
      </nav>

      <div className="container py-4">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h5 className="fw-bold mb-0" style={{ color: "var(--pg-blue)" }}>Vendor Uploads</h5>
            {pending.length > 0 && (
              <span className="badge bg-danger ms-2">{pending.length} ausstehend</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">Lade Uploads…</div>
        ) : uploads.length === 0 ? (
          <div className="card shadow-sm text-center py-5 text-muted">Noch keine Uploads.</div>
        ) : (
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="ps-3 py-3">Vendor</th>
                    <th>Datei</th>
                    <th>Status</th>
                    <th>Zeilen</th>
                    <th>Importiert</th>
                    <th>Hochgeladen</th>
                    <th>Freigegeben von</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {uploads.map(u => {
                    const badge = STATUS_BADGE[u.status] || STATUS_BADGE.pending;
                    return (
                      <tr key={u.id}>
                        <td className="ps-3">
                          <div className="fw-semibold">{u.vendor_name}</div>
                          <div className="text-muted small">{u.vendor_email}</div>
                        </td>
                        <td>
                          <div className="small fw-semibold">📄 {u.original_name}</div>
                          <div className="text-muted" style={{ fontSize: 11 }}>
                            {u.file_size ? (u.file_size / 1024).toFixed(0) + " KB" : "—"}
                          </div>
                        </td>
                        <td>
                          <span className={`badge rounded-pill ${badge.cls}`}>{badge.label}</span>
                        </td>
                        <td className="small">{u.total_rows ?? "—"}</td>
                        <td className="small text-success fw-semibold">{u.processed_rows ?? "—"}</td>
                        <td className="small text-muted">
                          {new Date(u.created_at).toLocaleString("de-DE")}
                        </td>
                        <td className="small text-muted">
                          {u.approved_at
                            ? `${u.approved_by || "admin"} · ${new Date(u.approved_at).toLocaleString("de-DE")}`
                            : "—"}
                        </td>
                        <td className="pe-3">
                          {u.status === "pending" && (
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-success"
                                disabled={acting === u.id}
                                onClick={() => approve(u.id)}
                              >
                                {acting === u.id ? "…" : "✓ Freigeben"}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                disabled={acting === u.id}
                                onClick={() => reject(u.id)}
                              >
                                ✕ Ablehnen
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
