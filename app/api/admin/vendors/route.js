// GET  /api/admin/vendors        — list all vendors
// POST /api/admin/vendors        — create a vendor
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await query(`
      SELECT
        v.*,
        COUNT(DISTINCT p.id)                                      AS product_count,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = TRUE)   AS active_products,
        COUNT(DISTINCT p.id) FILTER (WHERE p.is_active = FALSE)  AS paused_products,
        COUNT(DISTINCT ce.id)                                     AS total_clicks,
        COUNT(DISTINCT ce.id) * v.billing_rate                   AS total_billed_eur
      FROM vendors v
      LEFT JOIN products     p  ON p.vendor_id  = v.id
      LEFT JOIN click_events ce ON ce.vendor_id = v.id
      GROUP BY v.id
      ORDER BY v.name
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Vendors list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { name, website_url, logo_url, contact_email, billing_rate, member_since } = await request.json();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const result = await query(
      `INSERT INTO vendors (name, slug, website_url, logo_url, contact_email, billing_rate, member_since)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, slug, website_url || null, logo_url || null, contact_email || null,
       billing_rate ?? 0.005, member_since || new Date().toISOString().split("T")[0]]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    if (err.code === "23505") return NextResponse.json({ error: "Vendor already exists" }, { status: 409 });
    console.error("Create vendor error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
