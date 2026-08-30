"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("de-DE") : "—");
const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

const EMPTY = {
  vendor_id: "", code: "", title: "", description: "",
  discount_type: "percent", discount_value: "",
  valid_from: "", valid_until: "", tracking_url: "", is_active: true,
};

export default function CouponsAdmin() {
  const router = useRouter();
  const [coupons, setCoupons] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | "add" | coupon object
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then((r) => { if (!r.ok) router.push("/admin/login"); });
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [couponsRes, vendorsRes] = await Promise.all([
      fetch("/api/admin/coupons"),
      fetch("/api/admin/vendors"),
    ]);
    if (couponsRes.status === 401) { router.push("/admin/login"); return; }
    setCoupons(await couponsRes.json());
    setVendors(await vendorsRes.json());
    setLoading(false);
  }

  function openAdd() {
    setForm(EMPTY);
    setError("");
    setModal("add");
  }

  function openEdit(c) {
    setForm({
      vendor_id:      String(c.vendor_id),
      code:           c.code,
      title:          c.title,
      description:    c.description || "",
      discount_type:  c.discount_type,
      discount_value: c.discount_value ?? "",
      valid_from:     toInputDate(c.valid_from),
      valid_until:    toInputDate(c.valid_until),
      tracking_url:   c.tracking_url,
      is_active:      c.is_active,
    });
    setError("");
    setModal(c);
  }

  async function saveCoupon() {
    if (!form.vendor_id || !form.code || !form.title || !form.tracking_url) {
      setError("Vendor, Code, Titel und Tracking-Link sind erforderlich.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      ...form,
      vendor_id: parseInt(form.vendor_id),
      discount_value: form.discount_value === "" ? null : parseFloat(form.discount_value),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    };
    const isEdit = modal !== "add";
    const url    = isEdit ? `/api/admin/coupons/${modal.id}` : "/api/admin/coupons";
    const method = isEdit ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data   = await res.json();
    if (!res.ok) { setError(data.error || "Fehler"); setSaving(false); return; }
    setModal(null);
    setSaving(false);
    loadAll();
  }

  async function toggleActive(c) {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    loadAll();
  }

  async function deleteCoupon(c) {
    if (!confirm(`Gutschein "${c.title}" wirklich löschen?`)) return;
    await fetch(`/api/admin/coupons/${c.id}`, { method: "DELETE" });
    loadAll();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--pg-blue-light)" }}>
      <nav className="navbar bg-white shadow-sm px-4">
        <img src="/preis-gucken-logo.png" alt="Preisgucken" style={{ height: 48 }} />
        <div className="ms-3 d-flex gap-3">
          <a href="/admin/billing" className="btn btn-sm btn-outline-secondary">Billing</a>
          <a href="/admin/vendors" className="btn btn-sm btn-outline-secondary">Vendors</a>
          <a href="/admin/uploads" className="btn btn-sm btn-outline-secondary">Uploads</a>
          <a href="/admin/coupons" className="btn btn-sm btn-primary">Gutscheine</a>
        </div>
        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>Abmelden</button>
        </div>
      </nav>

      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h5 className="fw-bold mb-0" style={{ color: "var(--pg-blue)" }}>Gutschein-Verwaltung</h5>
          <button className="btn btn-primary" onClick={openAdd}>+ Gutschein hinzufügen</button>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">Lade Gutscheine…</div>
        ) : (
          <div className="card shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>Vendor</th>
                    <th>Code</th>
                    <th>Titel</th>
                    <th>Rabatt</th>
                    <th>Gültig bis</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} style={{ opacity: c.is_active ? 1 : 0.5 }}>
                      <td>{c.vendor_name}</td>
                      <td><code>{c.code}</code></td>
                      <td>{c.title}</td>
                      <td>{c.discount_value ? `${c.discount_value}${c.discount_type === "fixed" ? " €" : "%"}` : "—"}</td>
                      <td>{fmtDate(c.valid_until)}</td>
                      <td>
                        <span className={`badge ${c.is_active ? "bg-success" : "bg-secondary"}`}>
                          {c.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button className="btn btn-outline-secondary" onClick={() => openEdit(c)}>Bearbeiten</button>
                          <button className="btn btn-outline-secondary" onClick={() => toggleActive(c)}>
                            {c.is_active ? "Deaktivieren" : "Aktivieren"}
                          </button>
                          <button className="btn btn-outline-danger" onClick={() => deleteCoupon(c)}>Löschen</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {coupons.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-muted py-4">Noch keine Gutscheine angelegt.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modal === "add" ? "Gutschein hinzufügen" : "Gutschein bearbeiten"}</h5>
                <button className="btn-close" onClick={() => setModal(null)} />
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger py-2 small">{error}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Vendor</label>
                    <select
                      className="form-select"
                      value={form.vendor_id}
                      onChange={(e) => setForm((f) => ({ ...f, vendor_id: e.target.value }))}
                    >
                      <option value="">— auswählen —</option>
                      {vendors.map((v) => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Code</label>
                    <input className="form-control" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Titel</label>
                    <input className="form-control" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Beschreibung</label>
                    <textarea className="form-control" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Rabatt-Typ</label>
                    <select className="form-select" value={form.discount_type} onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value }))}>
                      <option value="percent">Prozent (%)</option>
                      <option value="fixed">Fixbetrag (€)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-semibold">Rabatt-Wert</label>
                    <input type="number" step="0.01" className="form-control" value={form.discount_value} onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))} />
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <div className="form-check form-switch">
                      <input className="form-check-input" type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} id="activeCheck" />
                      <label className="form-check-label" htmlFor="activeCheck">Aktiv</label>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Gültig ab</label>
                    <input type="date" className="form-control" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Gültig bis</label>
                    <input type="date" className="form-control" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-semibold">Tracking-Link (AWIN cread.php oder direkter Link)</label>
                    <input className="form-control" value={form.tracking_url} onChange={(e) => setForm((f) => ({ ...f, tracking_url: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setModal(null)}>Abbrechen</button>
                <button className="btn btn-primary" onClick={saveCoupon} disabled={saving}>
                  {saving ? "Speichert…" : "Speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
