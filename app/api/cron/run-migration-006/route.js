// Temporary migration-runner route — TO BE DELETED after use.
// GET /api/cron/run-migration-006
// Applies db/migrations/006_coupons_unique_code.sql via the app's own DB
// connection (avoids the `railway run` CLI proxy resolving to the wrong,
// empty database — confirmed happening repeatedly this session). Runs the
// exact statement already verified idempotent and safe against staging.
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_vendor_code_unique ON coupons(vendor_id, code)`);
    const check = await query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'coupons' AND indexname = 'idx_coupons_vendor_code_unique'
    `);
    return NextResponse.json({ ok: true, indexCreated: check.rows.length > 0 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
