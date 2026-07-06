"use client";
import { useState, useEffect } from "react";

const COOKIE_KEY = "pg_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    save({ necessary: true, stats: true, marketing: true });
  }

  function reject() {
    save({ necessary: true, stats: false, marketing: false });
  }

  function save(consent) {
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...consent, updatedAt: Date.now() }));
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "#fff",
        borderTop: "2px solid #1A3A6B",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.12)",
        padding: "1rem 1.5rem",
      }}
      role="dialog"
      aria-label="Cookie-Einstellungen"
    >
      <div className="container">
        <div className="row align-items-center g-3">
          <div className="col-12 col-md-7">
            <p className="mb-0 small">
              <strong>Wir verwenden Cookies</strong> – notwendige Cookies sind immer aktiv.
              Mit Klick auf „Alle akzeptieren" stimmen Sie auch Statistik- und Marketing-Cookies
              gemäß unserer{" "}
              <a href="/datenschutz" style={{ color: "#1A3A6B" }}>Datenschutzerklärung</a> zu.
            </p>
          </div>
          <div className="col-12 col-md-5 d-flex gap-2 flex-wrap justify-content-md-end">
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={reject}
            >
              Ablehnen
            </button>
            <a
              href="/cookie-einstellungen"
              className="btn btn-sm btn-outline-secondary"
            >
              Einstellungen
            </a>
            <button
              className="btn btn-sm btn-primary"
              onClick={accept}
              style={{ background: "#1A3A6B", borderColor: "#1A3A6B" }}
            >
              Alle akzeptieren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
