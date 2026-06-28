// app/api/categories/route.js
// GET /api/categories — returns all active categories with product count
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  const cacheKey = "categories:all";
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const result = await query(`
      SELECT
        category AS name,
        COUNT(*) AS product_count,
        MIN(price) AS min_price
      FROM products
      WHERE is_active = TRUE AND in_stock = TRUE
      GROUP BY category
      ORDER BY product_count DESC
    `);

    const categories = result.rows.map((r) => ({
      name: r.name,
      productCount: parseInt(r.product_count),
      minPrice: parseFloat(r.min_price),
    }));

    await cacheSet(cacheKey, categories, 3600); // cache 1 hour
    return NextResponse.json(categories);
  } catch (err) {
    console.error("Categories API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
