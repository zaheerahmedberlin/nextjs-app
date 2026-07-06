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
  const [pwModal, setPwModal]   = useState(null); // vendor object | null
  const [pwForm, setPwForm]     = useState({ email: "", password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError]   = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [cpModal, setCpModal]     = useState(false);
  const [cpForm, setCpForm]       = useState({ current: "", next: "", confirm: "" });
  const [cpError, setCpError]     = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [cpSaving, setCpSaving]   = useState(false);

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

  function openPwModal(v) {
    setPwForm({ email: v.email || v.contact_email || "", password: "" });
    setPwError("");
    setPwSuccess("");
    setPwModal(v);
  }

  async function saveVendorAccess() {
    if (!pwForm.email || !pwForm.password) {
      setPwError("E-Mail und Passwort erforderlich.");
      return;
    }
    if (pwForm.password.length < 8) {
      setPwError("Passwort muss mindestens 8 Zeichen haben.");
      return;
    }
    setPwSaving(true);
    setPwError("");
    const res  = await fetch(`/api/admin/vendors/${pwModal.id}/access`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email: pwForm.email, password: pwForm.password }),
    });
    const data = await res.json();
    setPwSaving(false);
    if (!res.ok) { setPwError(data.error || "Fehler"); return; }
    setPwSuccess("Portal-Zugang gespeichert ✓");
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

  async function handleVendorAction(v, action) {
    if (action === "edit")        return openEdit(v);
    if (action === "portal")      return openPwModal(v);
    if (action === "toggle")      return toggleActive(v);
    if (action === "pause_products") {
      await fetch(`/api/admin/vendors/${v.id}/products`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_active: false }),
      });
      loadVendors();
    }
    if (action === "resume_products") {
      await fetch(`/api/admin/vendors/${v.id}/products`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ is_active: true }),
      });
      loadVendors();
    }
  }

  async function changePassword() {
    setCpError(""); setCpSuccess("");
    if (!cpForm.current || !cpForm.next || !cpForm.confirm) return setCpError("Alle Felder erforderlich.");
    if (cpForm.next !== cpForm.confirm) return setCpError("Passwörter stimmen nicht überein.");
    if (cpForm.next.length < 8) return setCpError("Mindestens 8 Zeichen erforderlich.");
    setCpSaving(true);
    const res  = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: cpForm.current, newPassword: cpForm.next }),
    });
    const data = await res.json();
    setCpSaving(false);
    if (!res.ok) return setCpError(data.error || "Fehler");
    setCpSuccess("Passwort erfolgreich geändert ✓");
    setCpForm({ current: "", next: "", confirm: "" });
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
          <a href="/admin/uploads" className="btn btn-sm btn-outline-secondary">Uploads</a>
        </div>
        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={() => { setCpModal(true); setCpError(""); setCpSuccess(""); }}>🔐 Passwort</button>
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>Abmelden</button>
        </div>
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
                    <th className="text-center">Produkt-Status</th>
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
                      <td className="text-center">
                        {parseInt(v.product_count) === 0 ? (
                          <span className="text-muted small">—</span>
                        ) : (
                          <div className="d-flex align-items-center justify-content-center gap-1">
                            <span className="badge bg-success" title="Aktive Produkte">
                              ✓ {parseInt(v.active_products || 0).toLocaleString("de-DE")}
                            </span>
                            {parseInt(v.paused_products) > 0 && (
                              <span className="badge bg-warning text-dark" title="Pausierte Produkte">
                                ⏸ {parseInt(v.paused_products).toLocaleString("de-DE")}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="text-end">{parseInt(v.total_clicks).toLocaleString("de-DE")}</td>
                      <td className="text-end fw-semibold" style={{ color: "var(--pg-orange)" }}>{fmt(v.total_billed_eur || 0)}</td>
                      <td className="text-end small">{fmtRate(v.billing_rate)}</td>
                      <td className="small">{fmtDate(v.member_since)}</td>
                      <td>
                        <span className={`badge ${v.is_active ? "bg-success" : "bg-secondary"}`}>
                          {v.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="pe-3">
                        <select
                          className="form-select form-select-sm"
                          style={{ minWidth: 160 }}
                          value=""
                          onChange={e => { handleVendorAction(v, e.target.value); e.target.value = ""; }}
                        >
                          <option value="" disabled>Aktion wählen…</option>
                          <option value="edit">✏️ Bearbeiten</option>
                          <option value="portal">{v.email ? "🔑 Portal-Zugang ✓" : "🔑 Portal-Zugang"}</option>
                          <option value="toggle">{v.is_active ? "⏸ Vendor pausieren" : "▶️ Vendor aktivieren"}</option>
                          <option value="pause_products">🚫 Alle Produkte pausieren</option>
                          <option value="resume_products">✅ Alle Produkte aktivieren</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Passwort ändern Modal */}
      {cpModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold" style={{ color: "var(--pg-blue)" }}>Passwort ändern</h6>
                <button className="btn-close" onClick={() => setCpModal(false)} />
              </div>
              <div className="modal-body">
                {cpError   && <div className="alert alert-danger  py-2 small">{cpError}</div>}
                {cpSuccess && <div className="alert alert-success py-2 small">{cpSuccess}</div>}
                {[
                  { label: "Aktuelles Passwort", key: "current" },
                  { label: "Neues Passwort",     key: "next"    },
                  { label: "Passwort bestätigen", key: "confirm" },
                ].map(({ label, key }) => (
                  <div className="mb-3" key={key}>
                    <label className="form-label small fw-semibold">{label}</label>
                    <input
                      type="password"
                      className="form-control"
                      value={cpForm[key]}
                      onChange={e => setCpForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="Mindestens 8 Zeichen"
                    />
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setCpModal(false)}>Schließen</button>
                <button className="btn btn-primary" onClick={changePassword} disabled={cpSaving}>
                  {cpSaving ? "Speichern…" : "Passwort speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portal-Zugang Modal */}
      {pwModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title fw-bold" style={{ color: "var(--pg-blue)" }}>
                  Portal-Zugang: {pwModal.name}
                </h6>
                <button className="btn-close" onClick={() => setPwModal(null)} />
              </div>
              <div className="modal-body">
                {pwError   && <div className="alert alert-danger  py-2 small">{pwError}</div>}
                {pwSuccess && <div className="alert alert-success py-2 small">{pwSuccess}</div>}
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Login E-Mail</label>
                  <input
                    type="email"
                    className="form-control"
                    value={pwForm.email}
                    onChange={e => setPwForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="vendor@example.de"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Neues Passwort</label>
                  <input
                    type="password"
                    className="form-control"
                    value={pwForm.password}
                    onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Mindestens 8 Zeichen"
                  />
                </div>
                <p className="text-muted small mb-0">
                  Vendor kann sich danach unter <code>/vendor/login</code> anmelden.
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setPwModal(null)}>Schließen</button>
                <button className="btn btn-primary" onClick={saveVendorAccess} disabled={pwSaving}>
                  {pwSaving ? "Speichern…" : "Zugang speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
