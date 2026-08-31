// GET /api/cron/deactivate-expired-coupons
// Called hourly by GitHub Actions — protected by secret token.
//
// The public /gutscheine page and /api/coupons already filter by
// valid_until at query time, so an expired coupon never shows there. But
// nothing ever flips is_active in the DB itself, so the admin list (which
// has no date filter) keeps showing an expired coupon as "Aktiv" forever —
// exactly the confusion that caused a "coupons imported but not showing"
// report earlier. This closes that gap: once valid_until passes, the row
// itself gets marked inactive, not just hidden by a query filter.
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await query(`
      UPDATE coupons
      SET is_active = FALSE
      WHERE is_active = TRUE
        AND valid_until IS NOT NULL
        AND valid_until < NOW()
      RETURNING id, code
    `);
    return NextResponse.json({
      ok: true,
      deactivated: result.rowCount,
      codes: result.rows.map((r) => r.code),
    });
  } catch (err) {
    console.error("deactivate-expired-coupons cron error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
