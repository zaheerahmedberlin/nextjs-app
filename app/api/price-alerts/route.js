import { query } from "@/lib/db";
import { sendPriceAlertConfirmation } from "@/lib/email";
import { NextResponse } from "next/server";

// POST /api/price-alerts
// Body: { email, productId, targetPrice }
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { email, productId, targetPrice } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
  }
  if (!productId || !targetPrice || isNaN(parseFloat(targetPrice))) {
    return NextResponse.json({ error: "Produkt und Zielpreis erforderlich" }, { status: 400 });
  }

  try {
    // Fetch product info for confirmation email
    const prod = await query(
      `SELECT p.title, p.price, p.image, v.name AS vendor
       FROM products p LEFT JOIN vendors v ON v.id = p.vendor_id
       WHERE p.id = $1`,
      [productId]
    );
    if (!prod.rows.length) {
      return NextResponse.json({ error: "Produkt nicht gefunden" }, { status: 404 });
    }
    const product = prod.rows[0];

    // Upsert: one active alert per email+product
    await query(
      `INSERT INTO price_alerts (email, product_id, target_price, is_active, triggered_at)
       VALUES ($1, $2, $3, TRUE, NULL)
       ON CONFLICT DO NOTHING`,
      [email, productId, parseFloat(targetPrice)]
    );

    await sendPriceAlertConfirmation({ to: email, product, targetPrice: parseFloat(targetPrice) });

    return NextResponse.json({ ok: true, message: "Preisalarm gesetzt!" });
  } catch (err) {
    console.error("price-alert error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
