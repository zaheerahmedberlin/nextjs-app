// app/api/offers/route.js
// GET /api/offers — returns currently active offers/deals
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || ""; // e.g. "Black Friday"

  const cacheKey = `offers:active:${type}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const params = [new Date().toISOString()];
    let typeCondition = "";
    if (type) {
      params.push(type);
      typeCondition = `AND o.type = $${params.length}`;
    } else {
      typeCondition = `AND (o.type IS NULL OR o.type != 'Black Friday')`;
    }

    const result = await query(`
      SELECT
        o.id, o.title, o.image, o.price, o.old_price,
        o.category, o.offer_start, o.offer_end, o.type,
        p.url
      FROM offers o
      LEFT JOIN products p ON o.product_id = p.id
      WHERE o.is_active = TRUE
        AND o.offer_start <= $1
        AND o.offer_end   >= $1
        ${typeCondition}
      ORDER BY (o.old_price - o.price) DESC  -- biggest savings first
      LIMIT 50
    `, params);

    const offers = result.rows;
    await cacheSet(cacheKey, offers, 600); // cache 10 min
    return NextResponse.json(offers);
  } catch (err) {
    console.error("Offers API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
