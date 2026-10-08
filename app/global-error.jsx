"use client";
import { useEffect, useState } from "react";

// Next.js's top-level error boundary — replaces the ENTIRE tree (including
// app/layout.jsx) when an error escapes every nested boundary, so it must
// render its own <html>/<body> and can't assume globals.css or any other
// app chrome actually loaded. Added 2026-10-08 after a real production
// incident: mobile visitors hit a dead-end "Application error" screen with
// no way forward. Root cause — not mobile-specific, just more visible there
// since phones rarely get force-refreshed: every deploy does a clean
// `next build`, replacing every content-hashed /_next/static/chunks/* file.
// A browser tab or cached HTML page from before the latest deploy still
// references the OLD chunk hashes, which 400/404 once that deploy lands —
// a "ChunkLoadError" with no built-in recovery (confirmed live: curling the
// stale chunk URL returns Next's own 400 page, not the real asset). The fix
// is a one-time automatic reload, which fetches fresh HTML pointing at the
// chunks that actually exist now. Guarded by sessionStorage so a real,
// non-stale-chunk error doesn't reload forever.
const RELOAD_GUARD_KEY = "pg_chunk_reload_attempted";

function isChunkLoadError(error) {
  if (!error) return false;
  if (error.name === "ChunkLoadError") return true;
  const msg = String(error.message || "");
  return /Loading chunk .* failed/i.test(msg) || /ChunkLoadError/i.test(msg);
}

export default function GlobalError({ error, reset }) {
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (isChunkLoadError(error)) {
      let alreadyTried = false;
      try {
        alreadyTried = sessionStorage.getItem(RELOAD_GUARD_KEY) === "1";
      } catch {
        // Private browsing / storage blocked — treat as not-yet-tried,
        // worst case is one extra reload attempt, not a loop.
      }
      if (!alreadyTried) {
        try { sessionStorage.setItem(RELOAD_GUARD_KEY, "1"); } catch {}
        window.location.reload();
        return;
      }
    }
    setShowFallback(true);
  }, [error]);

  if (!showFallback) {
    // Reload is already in flight (or about to be) — avoid flashing an
    // error screen for the split second before the page refreshes.
    return (
      <html lang="de">
        <body style={{ margin: 0, background: "#fff" }} />
      </html>
    );
  }

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 24,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#fff",
          color: "#1A3A6B",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Etwas ist schiefgelaufen
        </h1>
        <p style={{ color: "#6b7280", marginBottom: 20, maxWidth: 360 }}>
          Die Seite konnte nicht geladen werden. Bitte versuchen Sie es erneut.
        </p>
        <button
          onClick={() => {
            try { sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch {}
            reset();
            window.location.reload();
          }}
          style={{
            background: "#1A3A6B",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 24px",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Seite neu laden
        </button>
      </body>
    </html>
  );
}
