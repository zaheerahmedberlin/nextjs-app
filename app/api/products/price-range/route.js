import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(`
      SELECT
        MIN(price)                                  AS min,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY price) AS max
      FROM products
      WHERE is_active = TRUE AND in_stock = TRUE AND price > 0
    `);
    const { min, max } = result.rows[0];
    return NextResponse.json({ min: parseFloat(min), max: parseFloat(max) });
  } catch (err) {
    console.error("price-range error:", err);
    return NextResponse.json({ min: 0, max: 10000 }, { status: 500 });
  }
}
