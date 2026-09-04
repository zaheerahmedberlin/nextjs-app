// components/CouponCodeButton.jsx
// Client component: the coupon code needs one-click copy (client-only API),
// so it can't live in the otherwise-server-rendered /gutscheine page —
// pulled out into its own small island rather than converting the whole
// page to a client component.
"use client";
import { useState } from "react";

export default function CouponCodeButton({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API can fail (older browsers, insecure context) — the
      // code is still visible in the button itself, so the user can
      // select it manually as a fallback instead of the action doing nothing.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="d-flex align-items-center justify-content-between border rounded px-3 py-2 mb-2 w-100"
      style={{
        background: copied ? "#d1e7dd" : "#f8f9fa",
        borderStyle: "dashed",
        borderColor: copied ? "#198754" : undefined,
        cursor: "pointer",
        transition: "background 0.15s ease",
      }}
      aria-live="polite"
    >
      <code className="fw-bold">{code}</code>
      <span className="small fw-semibold" style={{ color: copied ? "#198754" : "var(--pg-blue, #1A3A6B)" }}>
        {copied ? "Kopiert ✓" : "Code kopieren"}
      </span>
    </button>
  );
}
