// GET /api/vendor/list — vendor list for the partner logo strip (AWIN-only,
// default) or all active vendors (?all=true), always live from the DB.
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "true";

  try {
    const result = await query(
      `SELECT id, name, logo_url, website_url
       FROM vendors
       WHERE is_active = TRUE
         ${all ? "" : "AND awin_merchant_id IS NOT NULL"}
       ORDER BY name ASC`
    );
    return NextResponse.json({ vendors: result.rows });
  } catch (err) {
    return NextResponse.json({ vendors: [] });
  }
}
