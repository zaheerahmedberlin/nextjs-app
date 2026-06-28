// app/api/products/lowest/route.js
// GET /api/products/lowest — cheapest product per category
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  const cacheKey = "products:lowest:per-category";
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    // DISTINCT ON is PostgreSQL-specific — picks the cheapest per category
    const result = await query(`
      SELECT DISTINCT ON (category)
        id, title, image, price, category, vendor, url
      FROM products
      WHERE is_active = TRUE AND in_stock = TRUE
      ORDER BY category, price ASC
    `);

    await cacheSet(cacheKey, result.rows, 600);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Lowest price API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
