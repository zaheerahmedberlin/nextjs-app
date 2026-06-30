import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await query(`
      SELECT vendor, COUNT(*) AS clicks
      FROM click_events
      GROUP BY vendor
      ORDER BY clicks DESC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Billing vendors error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
