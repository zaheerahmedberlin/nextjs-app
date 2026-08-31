// GET /api/coupons — public, currently-active coupons only
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// No dynamic API usage here (no cookies/headers/request), so Next.js would
// otherwise treat this as static and cache the response from the first
// build/request forever — silently hiding every coupon added or expired
// after that, since the active-window filter depends on NOW() at request time.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query(`
      SELECT c.id, c.code, c.title, c.description, c.discount_type, c.discount_value,
             c.valid_from, c.valid_until, c.tracking_url,
             v.name AS vendor_name, v.slug AS vendor_slug, v.logo_url AS vendor_logo
      FROM coupons c
      JOIN vendors v ON v.id = c.vendor_id AND v.is_active = TRUE
      WHERE c.is_active = TRUE
        AND (c.valid_from  IS NULL OR c.valid_from  <= NOW())
        AND (c.valid_until IS NULL OR c.valid_until >= NOW())
      ORDER BY c.valid_until ASC NULLS LAST, c.created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Public coupons list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
