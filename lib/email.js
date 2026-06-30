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
