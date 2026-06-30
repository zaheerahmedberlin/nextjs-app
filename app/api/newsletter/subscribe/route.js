// POST /api/newsletter/subscribe
import { query } from "@/lib/db";
import { sendConfirmationEmail } from "@/lib/email";
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function POST(request) {
  try {
    const { email, categories = [] } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
    }

    const token = randomBytes(32).toString("hex");

    // Upsert — re-send confirmation if already subscribed but not confirmed
    const result = await query(
      `INSERT INTO newsletter_subscribers (email, categories, token)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET
         categories = EXCLUDED.categories,
         token      = CASE WHEN newsletter_subscribers.confirmed THEN newsletter_subscribers.token
                           ELSE EXCLUDED.token END
       RETURNING confirmed, token`,
      [email, categories, token]
    );

    const row = result.rows[0];

    if (row.confirmed) {
      return NextResponse.json({ message: "Du bist bereits angemeldet." });
    }

    await sendConfirmationEmail({ to: email, token: row.token, categories });

    return NextResponse.json({ message: "Bestätigungs-E-Mail gesendet. Bitte prüfe deinen Posteingang." });
  } catch (err) {
    console.error("Newsletter subscribe error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
