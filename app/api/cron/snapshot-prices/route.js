import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/cron/snapshot-prices
// Called nightly by cron-job.org — protected by secret token
export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await query(`
      INSERT INTO price_history (product_id, price, recorded_at)
      SELECT id, price, CURRENT_DATE
      FROM products
      WHERE is_active = TRUE
      ON CONFLICT (product_id, recorded_at) DO NOTHING
    `);

    return NextResponse.json({
      ok: true,
      recorded: res.rowCount,
      date: new Date().toISOString().split("T")[0],
    });
  } catch (err) {
    console.error("snapshot-prices cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
