// GET  /api/admin/coupons — list all coupons (any vendor type)
// POST /api/admin/coupons — create a coupon
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const result = await query(`
      SELECT c.*, v.name AS vendor_name, v.slug AS vendor_slug
      FROM coupons c
      JOIN vendors v ON v.id = c.vendor_id
      ORDER BY c.created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Coupons list error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const {
      vendor_id, code, title, description,
      discount_type, discount_value,
      valid_from, valid_until, tracking_url, is_active,
    } = await request.json();

    if (!vendor_id || !code || !title || !tracking_url) {
      return NextResponse.json({ error: "vendor_id, code, title and tracking_url are required" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO coupons
        (vendor_id, code, title, description, discount_type, discount_value, valid_from, valid_until, tracking_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (vendor_id, code) DO NOTHING
       RETURNING *`,
      [
        vendor_id, code, title, description || null,
        discount_type || "percent", discount_value ?? null,
        valid_from || null, valid_until || null,
        tracking_url, is_active ?? true,
      ]
    );
    // ON CONFLICT DO NOTHING returns zero rows instead of erroring — a
    // vendor already having this exact code (e.g. re-selecting an offer
    // already imported from AWIN) isn't a server error, it's a duplicate
    // that should be reported as such, not silently return an empty 201.
    if (!result.rows[0]) {
      return NextResponse.json({ error: "A coupon with this code already exists for this vendor" }, { status: 409 });
    }
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error("Create coupon error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
