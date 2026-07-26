// GET /api/cron/send-newsletter
// Called daily by GitHub Actions — sends up to 20 newsletter emails
import { query } from "@/lib/db";
import { sendNewsletterEmail } from "@/lib/email";
import { NextResponse } from "next/server";

const DAILY_LIMIT  = 20;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL   = "llama3-8b-8192";

// ── Groq: generate personalised intro ────────────────────────────────────────
async function generateIntro(categories, products) {
  if (!GROQ_API_KEY) {
    return "Diese Woche haben wir wieder tolle Angebote für dich zusammengestellt. Schau rein und spare bares Geld!";
  }

  const catLabel  = categories?.length ? categories.join(", ") : "verschiedene Kategorien";
  const prodNames = products.slice(0, 3).map((p) => p.title).join(", ");

  const prompt = `Du bist ein freundlicher Newsletter-Assistent für preisgucken.de, ein deutsches Preisvergleichsportal.
Schreibe 2 kurze, freundliche deutsche Sätze als Einleitung für einen Newsletter.
Die E-Mail enthält Deals aus diesen Kategorien: ${catLabel}.
Beispielprodukte: ${prodNames}.
Sei direkt, freundlich, kein "Hallo" und kein Name. Keine Emojis außer einem am Anfang.
Antworte NUR mit den 2 Sätzen, nichts anderes.`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:  "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model:       GROQ_MODEL,
        max_tokens:  120,
        temperature: 0.7,
        messages:    [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() ||
      "Diese Woche haben wir wieder tolle Angebote für dich. Schau rein und spare bares Geld!";
  } catch {
    return "Diese Woche haben wir wieder tolle Angebote für dich. Schau rein und spare bares Geld!";
  }
}

// ── Fetch products relevant to subscriber's categories ───────────────────────
async function getProductsForSubscriber(categories) {
  let rows;

  if (categories?.length) {
    // Match subscriber's chosen category slugs
    const result = await query(
      `SELECT p.id, p.title, p.price, p.old_price, p.image, p.url, v.name AS vendor
       FROM products p
       LEFT JOIN vendors v ON v.id = p.vendor_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.is_active = TRUE AND p.in_stock = TRUE
         AND c.slug = ANY($1)
       ORDER BY p.created_at DESC, p.price ASC
       LIMIT 6`,
      [categories]
    );
    rows = result.rows;
  }

  // Fallback: best deals overall if no category match
  if (!rows?.length) {
    const result = await query(
      `SELECT p.id, p.title, p.price, p.old_price, p.image, p.url, v.name AS vendor
       FROM products p
       LEFT JOIN vendors v ON v.id = p.vendor_id
       WHERE p.is_active = TRUE AND p.in_stock = TRUE
       ORDER BY p.created_at DESC, p.price ASC
       LIMIT 6`
    );
    rows = result.rows;
  }

  return rows;
}

// ── Main cron handler ─────────────────────────────────────────────────────────
export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure last_sent_at column exists
  await query(`
    ALTER TABLE newsletter_subscribers
    ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP
  `).catch(() => {});

  // Fetch subscribers due for a newsletter (not emailed in 6+ days)
  const subscribers = await query(
    `SELECT id, email, token, categories
     FROM newsletter_subscribers
     WHERE confirmed = TRUE
       AND unsubscribed_at IS NULL
       AND (last_sent_at IS NULL OR last_sent_at < NOW() - INTERVAL '6 days')
     ORDER BY last_sent_at ASC NULLS FIRST
     LIMIT $1`,
    [DAILY_LIMIT]
  );

  const results = { sent: 0, failed: 0, skipped: 0 };

  for (const sub of subscribers.rows) {
    try {
      const products = await getProductsForSubscriber(sub.categories);

      if (!products.length) {
        results.skipped++;
        continue;
      }

      const introText = await generateIntro(sub.categories, products);

      const { ok, error } = await sendNewsletterEmail({
        to:       sub.email,
        token:    sub.token,
        products,
        introText,
      });

      if (ok) {
        await query(
          "UPDATE newsletter_subscribers SET last_sent_at = NOW() WHERE id = $1",
          [sub.id]
        );
        results.sent++;
      } else {
        console.error(`Newsletter send failed for ${sub.email}:`, error);
        results.failed++;
      }
    } catch (err) {
      console.error(`Newsletter error for ${sub.email}:`, err.message);
      results.failed++;
    }
  }

  console.log(`[newsletter-cron] sent=${results.sent} failed=${results.failed} skipped=${results.skipped}`);
  return NextResponse.json({ ok: true, ...results, total: subscribers.rows.length });
}
