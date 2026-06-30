"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const fmt     = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const fmtRate = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("de-DE") : "—";

const EMPTY = { name: "", website_url: "", logo_url: "", contact_email: "", billing_rate: "0.005", member_since: "" };

export default function VendorsAdmin() {
  const router  = useRouter();
  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | "add" | vendor object
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => { if (!r.ok) router.push("/admin/login"); });
    loadVendors();
  }, []);

  async function loadVendors() {
    setLoading(true);
    const res = await fetch("/api/admin/vendors");
    if (res.status === 401) { router.push("/admin/login"); return; }
    setVendors(await res.json());
    setLoading(false);
  }

  function openAdd() {
    setForm(EMPTY);
    setError("");
    setModal("add");
  }

  function openEdit(v) {
    setForm({
      name:          v.name,
      website_url:   v.website_url   || "",
      logo_url:      v.logo_url      || "",
      contact_email: v.contact_email || "",
      billing_rate:  String(v.billing_rate),
      member_since:  v.member_since ? v.member_since.split("T")[0] : "",
    });
    setError("");
    setModal(v);
  }

  async function saveVendor() {
    setSaving(true);
    setError("");
    const payload = { ...form, billing_rate: parseFloat(form.billing_rate) };
    const isEdit  = modal !== "add";
    const url     = isEdit ? `/api/admin/vendors/${modal.id}` : "/api/admin/vendors";
    const method  = isEdit ? "PATCH" : "POST";
    const res     = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data    = await res.json();
    if (!res.ok) { setError(data.error || "Fehler"); setSaving(false); return; }
    setModal(null);
    setSaving(false);
    loadVendors();
  }

  async function toggleActive(v) {
    await fetch(`/api/admin/vendors/${v.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active: !v.is_active }),
    });
    loadVendors();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--pg-blue-light)" }}>

      {/* Header */}
      <nav className="navbar bg-white shadow-sm px-4">
        <img src="/preis-gucken-logo.png" alt="Preisgucken" style={{ height: 48 }} />
        <div className="ms-3 d-flex gap-3">
          <a href="/admin/billing" className="btn btn-sm btn-outline-secondary">Billing</a>
          <a href="/admin/vendors" className="btn btn-sm btn-primary">Vendors</a>
        </div>
        <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={logout}>Abmelden</button>
      </nav>

      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0" style={{ color: "var(--pg-blue)" }}>Vendor Verwaltung</h5>
          <button className="btn btn-primary" onClick={openAdd}>+ Vendor hinzufügen</button>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">Lade Vendors…</div>
        ) : (
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Vendor</th>
                    <th>Kontakt</th>
                    <th className="text-end">Produkte</th>
                    <th className="text-end">Klicks</th>
                    <th className="text-end">Billed</th>
                    <th className="text-end">Rate/Klick</th>
                    <th>Mitglied seit</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} style={{ opacity: v.is_active ? 1 : 0.5 }}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {v.logo_url && <img src={v.logo_url} alt={v.name} style={{ height: 24, objectFit: "contain" }} />}
                          <div>
                            <div className="fw-semibold">{v.name}</div>
                            {v.website_url && <a href={v.website_url} target="_blank" className="small text-muted">{v.website_url}</a>}
                          </div>
                        </div>
                      </td>
                      <td className="small text-muted">{v.contact_email || "—"}</td>
                      <td className="text-end">{parseInt(v.product_count).toLocaleString("de-DE")}</td>
                      <td className="text-end">{parseInt(v.total_clicks).toLocaleString("de-DE")}</td>
                      <td className="text-end fw-semibold" style={{ color: "var(--pg-orange)" }}>{fmt(v.total_billed_eur || 0)}</td>
                      <td className="text-end small">{fmtRate(v.billing_rate)}</td>
                      <td className="small">{fmtDate(v.member_since)}</td>
                      <td>
                        <span className={`badge ${v.is_active ? "bg-success" : "bg-secondary"}`}>
                          {v.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 justify-content-end">
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => openEdit(v)}>Bearbeiten</button>
                          <button
                            className={`btn btn-sm ${v.is_active ? "btn-outline-danger" : "btn-outline-success"}`}
                            onClick={() => toggleActive(v)}
                          >
                            {v.is_active ? "Deaktivieren" : "Aktivieren"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold" style={{ color: "var(--pg-blue)" }}>
                  {modal === "add" ? "Vendor hinzufügen" : `Bearbeiten: ${modal.name}`}
                </h6>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                {[
                  { label: "Name *",          key: "name",          type: "text" },
                  { label: "Website URL",     key: "website_url",   type: "url" },
                  { label: "Logo URL",        key: "logo_url",      type: "url" },
                  { label: "Kontakt E-Mail",  key: "contact_email", type: "email" },
                  { label: "Rate/Klick (€)",  key: "billing_rate",  type: "number" },
                  { label: "Mitglied seit",   key: "member_since",  type: "date" },
                ].map(({ label, key, type }) => (
                  <div className="mb-3" key={key}>
                    <label className="form-label small fw-semibold">{label}</label>
                    <input
                      type={type}
                      className="form-control"
                      value={form[key]}
                      step={key === "billing_rate" ? "0.001" : undefined}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setModal(null)}>Abbrechen</button>
                <button className="btn btn-primary" onClick={saveVendor} disabled={saving}>
                  {saving ? "Speichern…" : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
