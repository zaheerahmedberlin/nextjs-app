// Temporary diagnostic route — TO BE DELETED after use.
// GET /api/cron/debug-db-info
// Purely read-only: reports which database/host the running app is
// actually connected to, so we can compare against what `railway
// variables` reports for DATABASE_URL without needing admin session auth.
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const info = await query(`
      SELECT
        current_database()  AS database,
        inet_server_addr()::text AS server_addr,
        inet_server_port()  AS server_port,
        NOW()                AS now,
        (SELECT COUNT(*) FROM vendors)  AS vendor_count,
        (SELECT COUNT(*) FROM products) AS product_count,
        (SELECT COUNT(*) FROM coupons)  AS coupon_count
    `);
    return NextResponse.json(info.rows[0]);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
