// GET /api/vendor/list — returns AWIN-only vendors for the partner logo strip
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// Keep in sync with lib/affiliate.js VENDOR_MERCHANT_MAP
const AWIN_VENDORS = [
  "DeubaXXL",
  "Nutrientify",
  "Life Extension DACH",
  "Dowinx",
  "SHAMTAM",
  "BlazeVideo DE",
  "GERMENS DE",
];

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, logo_url, website_url
       FROM vendors
       WHERE is_active = TRUE
         AND name = ANY($1)
       ORDER BY name ASC`,
      [AWIN_VENDORS]
    );
    return NextResponse.json({ vendors: result.rows });
  } catch (err) {
    return NextResponse.json({ vendors: [] });
  }
}
