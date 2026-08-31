// Temporary diagnostic route — TO BE DELETED after use.
// GET /api/cron/debug-dup-check
// Read-only: checks for existing (vendor_id, code) duplicates in coupons
// before adding a unique constraint on that pair.
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT vendor_id, code, COUNT(*) AS n, array_agg(id) AS ids
      FROM coupons
      GROUP BY vendor_id, code
      HAVING COUNT(*) > 1
    `);
    return NextResponse.json({ duplicateGroups: result.rows });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
