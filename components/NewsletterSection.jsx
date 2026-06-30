"use client";
import { useState } from "react";

const CATEGORY_OPTIONS = [
  { slug: "schlafen",     label: "Schlafen" },
  { slug: "sitzen",       label: "Sitzen & Liegen" },
  { slug: "aufbewahrung", label: "Aufbewahrung" },
  { slug: "tische",       label: "Tische" },
  { slug: "leuchten",     label: "Leuchten" },
];

export default function NewsletterSection() {
  const [email, setEmail]           = useState("");
  const [categories, setCategories] = useState([]);
  const [status, setStatus]         = useState(null); // null | "loading" | "success" | "error"
  const [message, setMessage]       = useState("");

  function toggleCategory(slug) {
    setCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    const res  = await fetch("/api/newsletter/subscribe", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, categories }),
    });
    const data = await res.json();
    setStatus(res.ok ? "success" : "error");
    setMessage(data.message || data.error);
  }

  return (
    <section className="py-5" style={{ background: "var(--pg-blue)" }}>
      <div className="container">
        <div className="row justify-content-center text-center mb-4">
          <div className="col-md-7">
            <h2 className="fw-bold text-white mb-2">Verpasse keine Deals mehr</h2>
            <p className="text-white-50">
              Wähle deine Lieblingskategorien und erhalte wöchentlich die besten Angebote direkt in dein Postfach.
            </p>
          </div>
        </div>

        {status === "success" ? (
          <div className="row justify-content-center">
            <div className="col-md-6 text-center">
              <div className="alert alert-success fw-semibold">
                ✓ {message}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Category pills */}
            <div className="d-flex flex-wrap justify-content-center gap-2 mb-4">
              {CATEGORY_OPTIONS.map((cat) => {
                const active = categories.includes(cat.slug);
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => toggleCategory(cat.slug)}
                    className="btn btn-sm rounded-pill"
                    style={{
                      background:  active ? "var(--pg-orange)" : "rgba(255,255,255,0.15)",
                      color:       active ? "#fff" : "rgba(255,255,255,0.85)",
                      border:      active ? "2px solid var(--pg-orange)" : "2px solid rgba(255,255,255,0.3)",
                      fontWeight:  active ? 600 : 400,
                      transition:  "all 0.15s",
                    }}
                  >
                    {active ? "✓ " : ""}{cat.label}
                  </button>
                );
              })}
            </div>

            {/* Email input */}
            <div className="row justify-content-center">
              <div className="col-md-6">
                <div className="input-group input-group-lg shadow">
                  <input
                    type="email"
                    className="form-control"
                    placeholder="deine@email.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    className="btn fw-semibold"
                    disabled={status === "loading"}
                    style={{ background: "var(--pg-orange)", color: "#fff", minWidth: 140 }}
                  >
                    {status === "loading" ? "Senden…" : "Anmelden"}
                  </button>
                </div>
                {status === "error" && (
                  <div className="text-warning small mt-2 text-center">{message}</div>
                )}
                <p className="text-white-50 small text-center mt-2 mb-0">
                  Kein Spam. Abmeldung jederzeit möglich.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
