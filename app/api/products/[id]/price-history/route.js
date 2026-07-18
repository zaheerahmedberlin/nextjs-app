import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/products/[id]/price-history?days=90
export async function GET(request, { params }) {
  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 365);

  try {
    const res = await query(
      `SELECT
         recorded_at::text AS date,
         price::float
       FROM price_history
       WHERE product_id = $1
         AND recorded_at >= CURRENT_DATE - $2::int
       ORDER BY recorded_at ASC`,
      [id, days]
    );

    if (!res.rows.length) {
      return NextResponse.json({ history: [] });
    }

    const history = res.rows;
    const prices = history.map((r) => r.price);

    return NextResponse.json({
      history,
      stats: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        current: prices[prices.length - 1],
      },
    });
  } catch (err) {
    console.error("price-history error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
