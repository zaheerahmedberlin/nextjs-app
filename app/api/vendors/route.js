import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/cache";
import { NextResponse } from "next/server";

export async function GET() {
  const cacheKey = "vendors:public";
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const result = await query(
      `SELECT name FROM vendors WHERE id IN (SELECT DISTINCT vendor_id FROM products WHERE is_active = TRUE) ORDER BY name`
    );
    const data = { vendors: result.rows.map(r => r.name) };
    await cacheSet(cacheKey, data, 3600);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Public vendors error:", err);
    return NextResponse.json({ vendors: [] });
  }
}
