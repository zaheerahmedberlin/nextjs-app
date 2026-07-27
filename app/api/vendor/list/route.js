// GET /api/vendor/list — returns active vendors with website_url for logo strip
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, logo_url, website_url
       FROM vendors
       WHERE is_active = TRUE
         AND website_url IS NOT NULL
         AND website_url != ''
       ORDER BY name ASC`
    );
    return NextResponse.json({ vendors: result.rows });
  } catch (err) {
    return NextResponse.json({ vendors: [] });
  }
}
