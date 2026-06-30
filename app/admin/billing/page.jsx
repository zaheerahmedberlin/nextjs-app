"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const fmt     = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
const fmtRate = (n) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(n);

export default function BillingDashboard() {
  const router = useRouter();
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [vendor, setVendor]     = useState("");
  const [vendors, setVendors]   = useState([]);
  const [admin, setAdmin]       = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => {
      if (!r.ok) { router.push("/admin/login"); return; }
      return r.json();
    }).then((d) => d && setAdmin(d));

    fetch("/api/billing/vendors")
      .then((r) => r.ok ? r.json() : [])
      .then((rows) => setVendors(rows))
      .catch(() => {});
  }, []);

  useEffect(() => { loadBilling(); }, [from, to, vendor]);

  async function loadBilling() {
    setLoading(true);
    const params = new URLSearchParams();
    if (from)   params.set("from",   from);
    if (to)     params.set("to",     to);
    if (vendor) params.set("vendor", vendor);
    const res = await fetch(`/api/billing?${params}`);
    if (res.status === 401) { router.push("/admin/login"); return; }
    setData(await res.json());
    setLoading(false);
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
          <a href="/admin/billing" className="btn btn-sm btn-primary">Billing</a>
          <a href="/admin/vendors" className="btn btn-sm btn-outline-secondary">Vendors</a>
        </div>
        <div className="ms-auto d-flex align-items-center gap-3">
          {admin && <span className="small text-muted">{admin.email}</span>}
          <button className="btn btn-sm btn-outline-secondary" onClick={logout}>Abmelden</button>
        </div>
      </nav>

      <div className="container py-4">

        {/* Filters */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Vendor</label>
                <select className="form-select" value={vendor} onChange={(e) => setVendor(e.target.value)}>
                  <option value="">Alle Vendors</option>
                  {vendors.map((v) => (
                    <option key={v.vendor} value={v.vendor}>
                      {v.vendor} ({v.clicks.toLocaleString("de-DE")} Klicks)
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Von</label>
                <input type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="col-md-3">
                <label className="form-label small fw-semibold">Bis</label>
                <input type="date" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="col-md-3">
                <button className="btn btn-outline-secondary w-100" onClick={() => { setFrom(""); setTo(""); setVendor(""); }}>
                  Filter zurücksetzen
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5 text-muted">Lade Daten…</div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="card shadow-sm text-center p-3">
                  <div className="small text-muted mb-1">Gesamt Klicks</div>
                  <div className="fw-bold fs-3" style={{ color: "var(--pg-blue)" }}>
                    {data.total_clicks.toLocaleString("de-DE")}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm text-center p-3">
                  <div className="small text-muted mb-1">Gesamt Kosten</div>
                  <div className="fw-bold fs-3" style={{ color: "var(--pg-orange)" }}>
                    {fmt(data.total_cost_eur)}
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card shadow-sm text-center p-3">
                  <div className="small text-muted mb-1">Preis pro Klick</div>
                  <div className="fw-bold fs-3" style={{ color: "var(--pg-blue)" }}>
                    {fmt(data.rate_per_click_eur)}
                  </div>
                </div>
              </div>
            </div>

            {/* Per-vendor table */}
            <div className="card shadow-sm mb-4">
              <div className="card-header fw-bold" style={{ color: "var(--pg-blue)" }}>Vendor Übersicht</div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Vendor</th>
                      <th className="text-end">Rate/Klick</th>
                      <th className="text-end">Klicks</th>
                      <th className="text-end">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.vendors.map((v) => (
                      <tr key={v.vendor}>
                        <td className="fw-semibold">{v.vendor}</td>
                        <td className="text-end small text-muted">{fmtRate(v.billing_rate)}</td>
                        <td className="text-end">{v.clicks.toLocaleString("de-DE")}</td>
                        <td className="text-end fw-semibold" style={{ color: "var(--pg-orange)" }}>{fmt(v.cost_eur)}</td>
                      </tr>
                    ))}
                    {data.vendors.length === 0 && (
                      <tr><td colSpan={3} className="text-center text-muted py-3">Keine Daten</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily breakdown */}
            <div className="card shadow-sm">
              <div className="card-header fw-bold" style={{ color: "var(--pg-blue)" }}>Tagesübersicht</div>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Datum</th>
                      <th>Vendor</th>
                      <th className="text-end">Klicks</th>
                      <th className="text-end">Kosten</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.daily.map((d, i) => (
                      <tr key={i}>
                        <td>{new Date(d.day).toLocaleDateString("de-DE")}</td>
                        <td>{d.vendor}</td>
                        <td className="text-end">{d.clicks.toLocaleString("de-DE")}</td>
                        <td className="text-end" style={{ color: "var(--pg-orange)" }}>{fmt(d.cost_eur)}</td>
                      </tr>
                    ))}
                    {data.daily.length === 0 && (
                      <tr><td colSpan={4} className="text-center text-muted py-3">Keine Daten</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
