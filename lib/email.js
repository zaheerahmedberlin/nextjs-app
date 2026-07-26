// lib/email.js — email sending via Resend
// To activate: npm install resend  and set RESEND_API_KEY in .env.local

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.EMAIL_FROM ?? "newsletter@preisgucken.de";
const BASE_URL       = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function sendConfirmationEmail({ to, token, categories }) {
  const confirmUrl     = `${BASE_URL}/api/newsletter/confirm/${token}`;
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?token=${token}`;
  const catList        = categories.length > 0 ? categories.join(", ") : "alle Kategorien";

  if (!RESEND_API_KEY) {
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
            Falls du dich nicht angemeldet hast, kannst du diese E-Mail ignorieren.<br/>
            <a href="${unsubscribeUrl}" style="color:#aaa">Abmelden</a>
          </p>
        </div>
      `,
    }),
  });

  return res.ok ? { ok: true } : { ok: false, error: await res.text() };
}

export async function sendNewsletterEmail({ to, token, products, introText }) {
  const unsubscribeUrl = `${BASE_URL}/api/newsletter/unsubscribe?token=${token}`;
  const impressumUrl   = `${BASE_URL}/impressum`;

  const productCards = products.map((p) => {
    const price = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(p.price);
    const old   = p.old_price ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(p.old_price) : null;
    const affiliateUrl = `${BASE_URL}/api/track?id=${p.id}&redirect=${encodeURIComponent(p.url)}`;
    return `
      <div style="border:1px solid #eee;border-radius:8px;padding:14px;margin-bottom:14px;display:flex;gap:14px;align-items:flex-start">
        ${p.image ? `<img src="${p.image}" style="width:80px;height:80px;object-fit:contain;border-radius:4px;flex-shrink:0" />` : ""}
        <div style="flex:1;min-width:0">
          <p style="margin:0 0 4px;font-weight:600;color:#1A3A6B;font-size:14px;line-height:1.3">${p.title}</p>
          ${p.vendor ? `<p style="margin:0 0 6px;color:#888;font-size:12px">${p.vendor}</p>` : ""}
          <div>
            <span style="font-size:18px;font-weight:700;color:#2d7a3a">${price}</span>
            ${old ? `<span style="font-size:13px;color:#aaa;text-decoration:line-through;margin-left:8px">${old}</span>` : ""}
          </div>
          <a href="${affiliateUrl}"
             style="display:inline-block;margin-top:8px;background:#F07D00;color:#fff;padding:6px 16px;border-radius:4px;text-decoration:none;font-size:13px;font-weight:600">
            Preis prüfen →
          </a>
        </div>
      </div>`;
  }).join("");

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#222">
      <div style="background:#1A3A6B;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:22px">preisgucken.de™</h1>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Preise vergleichen &amp; sparen</p>
      </div>
      <div style="border:1px solid #eee;border-top:none;padding:24px;border-radius:0 0 8px 8px">
        <p style="color:#444;line-height:1.7;margin-top:0">${introText}</p>
        ${productCards}
        <div style="text-align:center;margin-top:24px">
          <a href="${BASE_URL}/?utm_source=newsletter&utm_medium=email"
             style="display:inline-block;background:#1A3A6B;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">
            Alle Angebote ansehen →
          </a>
        </div>
      </div>
      <p style="color:#aaa;font-size:11px;text-align:center;margin-top:16px;line-height:1.8">
        preisgucken.de™ · Du erhältst diese E-Mail weil du dich für unseren Newsletter angemeldet hast.<br/>
        <a href="${unsubscribeUrl}" style="color:#aaa">Abmelden</a> ·
        <a href="${impressumUrl}" style="color:#aaa">Impressum</a>
      </p>
    </div>`;

  if (!RESEND_API_KEY) {
    console.log(`[EMAIL PLACEHOLDER] Newsletter to ${to} — ${products.length} products`);
    return { ok: true, placeholder: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from:    `preisgucken.de™ <${FROM_EMAIL}>`,
      to:      [to],
      subject: "🛒 Deine Deals der Woche – preisgucken.de",
      html,
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
