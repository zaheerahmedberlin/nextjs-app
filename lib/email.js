// lib/email.js — email sending via Resend
// To activate: npm install resend  and set RESEND_API_KEY in .env.local

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.EMAIL_FROM ?? "newsletter@preisgucken.de";
const BASE_URL       = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function sendConfirmationEmail({ to, token, categories }) {
  const confirmUrl = `${BASE_URL}/api/newsletter/confirm/${token}`;
  const catList    = categories.length > 0 ? categories.join(", ") : "alle Kategorien";

  if (!RESEND_API_KEY) {
    // Placeholder — log instead of sending
    console.log(`[EMAIL PLACEHOLDER] Confirmation email to ${to}`);
    console.log(`Confirm URL: ${confirmUrl}`);
    console.log(`Categories: ${catList}`);
    return { ok: true, placeholder: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [to],
      subject: "Bitte bestätige deine Anmeldung – preisgucken.de",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#1A3A6B">Fast geschafft!</h2>
          <p>Du hast dich für den <strong>preisgucken.de Newsletter</strong> angemeldet.</p>
          <p>Kategorien: <strong>${catList}</strong></p>
          <p>Klicke auf den Button, um deine E-Mail-Adresse zu bestätigen:</p>
          <a href="${confirmUrl}"
             style="display:inline-block;background:#1A3A6B;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            E-Mail bestätigen
          </a>
          <p style="color:#888;font-size:12px;margin-top:24px">
            Falls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.
          </p>
        </div>
      `,
    }),
  });

  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}

export async function sendDealAlertConfirmation({ to, query, categorySlug, maxPrice }) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL PLACEHOLDER] Deal alert confirmation to ${to} for "${query || categorySlug}"`);
    return { ok: true, placeholder: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    FROM_EMAIL,
      to:      [to],
      subject: "Deal-Alarm gesetzt – preisgucken.de",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#1A3A6B">Dein Deal-Alarm ist aktiv!</h2>
          <p>Wir benachrichtigen dich, wenn es neue Angebote gibt für:</p>
          <ul>
            ${query       ? `<li>Suche: <strong>${query}</strong></li>`        : ""}
            ${categorySlug? `<li>Kategorie: <strong>${categorySlug}</strong></li>` : ""}
            ${maxPrice    ? `<li>Bis: <strong>${maxPrice} €</strong></li>`     : ""}
          </ul>
          <p style="color:#888;font-size:12px;margin-top:24px">preisgucken.de — Preise vergleichen & sparen</p>
        </div>
      `,
    }),
  });

  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}

const fmt = (v) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

export async function sendPriceAlertConfirmation({ to, product, targetPrice }) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL PLACEHOLDER] Price alert confirmation to ${to} — target: ${fmt(targetPrice)} for "${product.title}"`);
    return { ok: true, placeholder: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `Preisalarm gesetzt: ${product.title} – preisgucken.de`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#1A3A6B">Preisalarm aktiv ✓</h2>
          <p>Wir benachrichtigen Sie, sobald der Preis für:</p>
          <div style="border:1px solid #eee;border-radius:8px;padding:16px;margin:16px 0">
            ${product.image ? `<img src="${product.image}" style="width:80px;height:80px;object-fit:contain;float:right" />` : ""}
            <strong style="color:#1A3A6B">${product.title}</strong><br/>
            ${product.vendor ? `<span style="color:#888;font-size:13px">${product.vendor}</span><br/>` : ""}
            <span style="font-size:13px">Aktueller Preis: <strong>${fmt(product.price)}</strong></span><br/>
            <span style="font-size:13px">Ihr Zielpreis: <strong style="color:#2d7a3a">${fmt(targetPrice)}</strong></span>
          </div>
          <p>...auf oder unter <strong style="color:#2d7a3a">${fmt(targetPrice)}</strong> fällt.</p>
          <p style="color:#888;font-size:12px;margin-top:24px">
            preisgucken.de – Preise vergleichen &amp; sparen<br/>
            Um den Alarm zu deaktivieren antworten Sie einfach auf diese E-Mail.
          </p>
        </div>
      `,
    }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}

export async function sendPriceAlertTriggered({ to, product, targetPrice, currentPrice }) {
  if (!RESEND_API_KEY) {
    console.log(`[EMAIL PLACEHOLDER] Price alert TRIGGERED to ${to} — ${fmt(currentPrice)} <= ${fmt(targetPrice)} for "${product.title}"`);
    return { ok: true, placeholder: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject: `🔔 Preisalarm! ${product.title} jetzt ${fmt(currentPrice)} – preisgucken.de`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:auto">
          <h2 style="color:#2d7a3a">🔔 Ihr Preisalarm wurde ausgelöst!</h2>
          <div style="border:2px solid #2d7a3a;border-radius:8px;padding:16px;margin:16px 0;background:#e6f4ea">
            ${product.image ? `<img src="${product.image}" style="width:80px;height:80px;object-fit:contain;float:right" />` : ""}
            <strong style="color:#1A3A6B">${product.title}</strong><br/>
            ${product.vendor ? `<span style="color:#888;font-size:13px">${product.vendor}</span><br/><br/>` : "<br/>"}
            <span style="font-size:22px;font-weight:bold;color:#2d7a3a">${fmt(currentPrice)}</span>
            <span style="color:#888;font-size:13px;margin-left:8px">(Ihr Ziel: ${fmt(targetPrice)})</span>
          </div>
          <a href="${product.url}" target="_blank"
             style="display:inline-block;background:#F07D00;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">
            Jetzt kaufen →
          </a>
          <p style="color:#888;font-size:12px;margin-top:24px">
            Dieser Preisalarm wurde automatisch deaktiviert. Stellen Sie ihn jederzeit neu ein auf preisgucken.de
          </p>
        </div>
      `,
    }),
  });
  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}
