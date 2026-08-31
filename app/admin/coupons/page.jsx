"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// AWIN promo emails specify exact date+time cutoffs (e.g. "31/08/2026
// 10:59"), not just a date — a coupon shown as expired 11 hours early (or
// valid 11 hours too long) because only the date was captured is a real
// correctness bug, so these need full datetime, not date-only.
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "—");

// datetime-local needs "YYYY-MM-DDTHH:mm" representing the browser's LOCAL
// wall-clock time — must use local getters (getFullYear/getHours/...), not
// toISOString(), which would show the UTC instant mislabeled as local time
// and throw the displayed value off by the local UTC offset.
const toInputDateTime = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

// Inverse: a naive "YYYY-MM-DDTHH:mm" string from a datetime-local input is
// parsed by `new Date()` as local time, so converting to ISO here bakes in
// an explicit UTC offset before it hits the TIMESTAMPTZ column — sending the
// naive string straight to the API left Postgres to guess the timezone from
// its own session setting, silently shifting valid_from/valid_until.
const toISOFromLocalInput = (s) => (s ? new Date(s).toISOString() : null);

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

  // AWIN import review flow — fetch is read-only (nothing written until the
  // admin explicitly picks offers and clicks Import), reuses the existing
  // POST /api/admin/coupons for the actual insert rather than duplicating
  // that logic here.
  const [awinModal, setAwinModal]     = useState(false);
  const [awinLoading, setAwinLoading] = useState(false);
  const [awinError, setAwinError]     = useState("");
  const [awinOffers, setAwinOffers]   = useState([]);
  const [awinSelected, setAwinSelected] = useState(new Set());
  const [awinImporting, setAwinImporting] = useState(false);
  const [awinResult, setAwinResult]   = useState("");

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
      valid_from:     toInputDateTime(c.valid_from),
      valid_until:    toInputDateTime(c.valid_until),
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
      valid_from: toISOFromLocalInput(form.valid_from),
      valid_until: toISOFromLocalInput(form.valid_until),
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

  async function openAwinImport() {
    setAwinModal(true);
    setAwinLoading(true);
    setAwinError("");
    setAwinResult("");
    setAwinSelected(new Set());
    const res = await fetch("/api/admin/coupons/awin-import");
    const data = await res.json();
    setAwinLoading(false);
    if (!res.ok) { setAwinError(data.error || "Fehler beim Laden der AWIN-Angebote."); return; }
    setAwinOffers(data.offers);
  }

  // (vendor_id, code) pairs already in the coupons table — recomputed from
  // the currently-loaded list, which loadAll() refreshes after every import
  // batch, so this stays in sync across repeated modal opens in one session.
  const importedKeys = new Set(coupons.map((c) => `${c.vendor_id}:${c.code}`));

  function alreadyImported(o) {
    return o.localVendorId && importedKeys.has(`${o.localVendorId}:${o.voucherCode}`);
  }

  function isImportable(o) {
    // Our coupons table needs a real code — plain "promotion" entries with
    // no voucher code don't fit the schema, so they're shown for visibility
    // but can't be selected. A (vendor_id, code) pair already imported is
    // now also enforced server-side (unique constraint, 409 on retry), but
    // graying it out here avoids the round-trip and explains why upfront.
    return o.type === "voucher" && !!o.voucherCode && !!o.localVendorId && !alreadyImported(o);
  }

  function toggleAwinSelected(promotionId) {
    setAwinSelected((prev) => {
      const next = new Set(prev);
      if (next.has(promotionId)) next.delete(promotionId); else next.add(promotionId);
      return next;
    });
  }

  async function importSelectedAwinOffers() {
    setAwinImporting(true);
    setAwinResult("");
    const toImport = awinOffers.filter((o) => awinSelected.has(o.promotionId));
    let ok = 0, failed = 0;
    for (const o of toImport) {
      const payload = {
        vendor_id: o.localVendorId,
        code: o.voucherCode,
        title: o.title,
        description: o.terms || o.description || null,
        discount_type: "percent", // AWIN's discount amount is embedded in free text (title/description), not a clean number — admin can refine via "Bearbeiten" after import
        discount_value: null,
        // Keep the full ISO string with its "Z" offset — AWIN's startDate/endDate
        // already carry an explicit UTC offset, so this is unambiguous as-is;
        // slicing it down to "YYYY-MM-DDTHH:mm" (as the manual form's naive
        // input needs) would strip that offset and let Postgres reinterpret
        // it in the session's default timezone instead of UTC.
        valid_from: o.startDate ? new Date(o.startDate).toISOString() : null,
        valid_until: o.endDate ? new Date(o.endDate).toISOString() : null,
        tracking_url: o.trackingUrl,
        is_active: true,
      };
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) ok++; else failed++;
    }
    setAwinImporting(false);
    setAwinResult(`${ok} importiert${failed ? `, ${failed} fehlgeschlagen` : ""}.`);
    setAwinSelected(new Set());
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
          <div className="d-flex gap-2">
            <button className="btn btn-outline-primary" onClick={openAwinImport}>🔄 AWIN Angebote abrufen</button>
            <button className="btn btn-primary" onClick={openAdd}>+ Gutschein hinzufügen</button>
          </div>
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
                    <th>Gültig bis (Zeit)</th>
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
                      <td>{fmtDateTime(c.valid_until)}</td>
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
                    <label className="form-label small fw-semibold">Gültig ab (Datum + Uhrzeit)</label>
                    <input type="datetime-local" className="form-control" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
                    <p className="small text-muted mb-0 mt-1">Zeit in deiner lokalen Zeitzone (passend zu AWIN's "Central Time Zone"-Angaben).</p>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-semibold">Gültig bis (Datum + Uhrzeit)</label>
                    <input type="datetime-local" className="form-control" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
                    <p className="small text-muted mb-0 mt-1">Zeit in deiner lokalen Zeitzone (passend zu AWIN's "Central Time Zone"-Angaben).</p>
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

      {awinModal && (
        <div className="modal d-block" style={{ background: "rgba(0,0,0,0.5)" }} tabIndex={-1}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">AWIN Angebote — zur Auswahl</h5>
                <button className="btn-close" onClick={() => setAwinModal(false)} />
              </div>
              <div className="modal-body">
                {awinLoading && <div className="text-center py-4 text-muted">Lade Angebote von AWIN…</div>}
                {awinError && <div className="alert alert-danger py-2 small">{awinError}</div>}
                {awinResult && <div className="alert alert-success py-2 small">{awinResult}</div>}
                {!awinLoading && !awinError && (
                  <>
                    <p className="small text-muted">
                      Nur Gutscheincodes mit passendem lokalem Vendor sind auswählbar. Reine
                      "Promotion"-Einträge ohne Code (kein voucherCode), Angebote von nicht
                      onboardeten Vendoren und bereits importierte Codes werden zur Übersicht
                      angezeigt, sind aber nicht (erneut) importierbar.
                    </p>
                    <div className="table-responsive" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                      <table className="table table-sm table-hover mb-0 align-middle">
                        <thead className="table-light" style={{ position: "sticky", top: 0 }}>
                          <tr>
                            <th></th>
                            <th>Vendor (AWIN)</th>
                            <th>Lokaler Vendor</th>
                            <th>Typ</th>
                            <th>Code</th>
                            <th>Titel</th>
                            <th>Gültig bis</th>
                          </tr>
                        </thead>
                        <tbody>
                          {awinOffers.map((o) => {
                            const importable = isImportable(o);
                            return (
                              <tr key={o.promotionId} style={{ opacity: importable ? 1 : 0.5 }}>
                                <td>
                                  <input
                                    type="checkbox"
                                    disabled={!importable}
                                    checked={awinSelected.has(o.promotionId)}
                                    onChange={() => toggleAwinSelected(o.promotionId)}
                                  />
                                </td>
                                <td className="small">{o.advertiserName}</td>
                                <td className="small">{o.localVendorName || <em>kein lokaler Vendor</em>}</td>
                                <td className="small">
                                  {o.type}
                                  {alreadyImported(o) && <span className="badge bg-secondary ms-1">bereits importiert</span>}
                                </td>
                                <td className="small"><code>{o.voucherCode || "—"}</code></td>
                                <td className="small">{o.title}</td>
                                <td className="small">{o.endDate ? new Date(o.endDate).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                              </tr>
                            );
                          })}
                          {awinOffers.length === 0 && (
                            <tr><td colSpan={7} className="text-center text-muted py-4">Keine aktiven AWIN-Angebote gefunden.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setAwinModal(false)}>Schließen</button>
                <button
                  className="btn btn-primary"
                  onClick={importSelectedAwinOffers}
                  disabled={awinImporting || awinSelected.size === 0}
                >
                  {awinImporting ? "Importiert…" : `${awinSelected.size} Gutschein${awinSelected.size === 1 ? "" : "e"} importieren`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
