// Temporary diagnostic route — TO BE DELETED after use.
// GET /api/cron/debug-coupons
// Read-only: lists ALL coupons (not just currently-active ones) with their
// raw valid_from/valid_until against the DB's NOW(), to diagnose why newly
// imported coupons aren't showing on the public /gutscheine page.
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      SELECT c.id, c.code, c.vendor_id, v.name AS vendor_name, c.is_active,
             c.valid_from, c.valid_until, c.created_at,
             NOW() AS now,
             (c.valid_from IS NULL OR c.valid_from <= NOW()) AS from_ok,
             (c.valid_until IS NULL OR c.valid_until >= NOW()) AS until_ok
      FROM coupons c
      JOIN vendors v ON v.id = c.vendor_id
      ORDER BY c.id DESC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
