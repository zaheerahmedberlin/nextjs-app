"use client";
import { useState, useEffect } from "react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const COOKIE_KEY = "pg_cookie_consent";

export default function CookieEinstellungenPage() {
  const [stats, setStats] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(COOKIE_KEY) || "{}");
      setStats(!!stored.stats);
      setMarketing(!!stored.marketing);
    } catch {}
  }, []);

  function save() {
    const consent = { necessary: true, stats, marketing, updatedAt: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function acceptAll() {
    setStats(true);
    setMarketing(true);
    const consent = { necessary: true, stats: true, marketing: true, updatedAt: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function rejectAll() {
    setStats(false);
    setMarketing(false);
    const consent = { necessary: true, stats: false, marketing: false, updatedAt: Date.now() };
    localStorage.setItem(COOKIE_KEY, JSON.stringify(consent));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <>
      <Navbar />
      <main className="container py-5" style={{ maxWidth: 680 }}>
        <h1 className="fw-bold mb-2">Cookie-Einstellungen</h1>
        <p className="text-muted mb-5">
          Hier können Sie Ihre Cookie-Präferenzen jederzeit anpassen. Notwendige Cookies sind
          für den Betrieb der Website erforderlich und können nicht deaktiviert werden.
        </p>

        {saved && (
          <div className="alert alert-success">
            Ihre Einstellungen wurden gespeichert.
          </div>
        )}

        {/* Necessary */}
        <div className="card border-0 shadow-sm p-4 mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h6 fw-bold mb-1">Notwendige Cookies</h2>
              <p className="small text-muted mb-0">
                Erforderlich für den Betrieb der Website. Können nicht deaktiviert werden.
              </p>
            </div>
            <div className="form-check form-switch ms-3">
              <input className="form-check-input" type="checkbox" checked disabled />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="card border-0 shadow-sm p-4 mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h6 fw-bold mb-1">Statistik-Cookies</h2>
              <p className="small text-muted mb-0">
                Google Analytics 4 – hilft uns zu verstehen, wie Besucher die Website nutzen
                (IP-anonymisiert, keine Weitergabe an Dritte zu Werbezwecken).
              </p>
            </div>
            <div className="form-check form-switch ms-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={stats}
                onChange={(e) => setStats(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Marketing */}
        <div className="card border-0 shadow-sm p-4 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 className="h6 fw-bold mb-1">Marketing-Cookies</h2>
              <p className="small text-muted mb-0">
                Werden von Affiliate-Netzwerken (Awin, Amazon) gesetzt, um Provisionen
                korrekt zuzuordnen. Keine personalisierten Werbeanzeigen.
              </p>
            </div>
            <div className="form-check form-switch ms-3">
              <input
                className="form-check-input"
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-primary" onClick={save}>
            Auswahl speichern
          </button>
          <button className="btn btn-outline-secondary" onClick={acceptAll}>
            Alle akzeptieren
          </button>
          <button className="btn btn-outline-secondary" onClick={rejectAll}>
            Alle ablehnen
          </button>
        </div>

        <p className="small text-muted mt-4">
          Weitere Informationen finden Sie in unserer{" "}
          <a href="/datenschutz">Datenschutzerklärung</a>.
        </p>
      </main>
      <Footer />
    </>
  );
}
