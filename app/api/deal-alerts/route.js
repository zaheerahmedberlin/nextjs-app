// POST /api/deal-alerts — save a deal alert for a search
import { query } from "@/lib/db";
import { sendDealAlertConfirmation } from "@/lib/email";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { email, search_query, category_slug, max_price } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse" }, { status: 400 });
    }
    if (!search_query && !category_slug) {
      return NextResponse.json({ error: "Suche oder Kategorie erforderlich" }, { status: 400 });
    }

    await query(
      `INSERT INTO deal_alerts (email, search_query, category_slug, max_price)
       VALUES ($1, $2, $3, $4)`,
      [email, search_query || null, category_slug || null, max_price || null]
    );

    await sendDealAlertConfirmation({ to: email, query: search_query, categorySlug: category_slug, maxPrice: max_price });

    return NextResponse.json({ message: "Deal-Alarm gespeichert!" });
  } catch (err) {
    console.error("Deal alert error:", err);
    return NextResponse.json({ error: "Interner Fehler" }, { status: 500 });
  }
}
