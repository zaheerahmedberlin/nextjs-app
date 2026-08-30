// PATCH  /api/admin/coupons/[id] — update a coupon
// DELETE /api/admin/coupons/[id] — remove a coupon (hard delete — no click history tied to a coupon row itself)
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const {
      vendor_id, code, title, description,
      discount_type, discount_value,
      valid_from, valid_until, tracking_url, is_active,
    } = await request.json();
    const { id } = await params;

    const result = await query(
      `UPDATE coupons SET
        vendor_id      = COALESCE($1, vendor_id),
        code           = COALESCE($2, code),
        title          = COALESCE($3, title),
        description    = COALESCE($4, description),
        discount_type  = COALESCE($5, discount_type),
        discount_value = COALESCE($6, discount_value),
        valid_from     = COALESCE($7, valid_from),
        valid_until    = COALESCE($8, valid_until),
        tracking_url   = COALESCE($9, tracking_url),
        is_active      = COALESCE($10, is_active)
      WHERE id = $11 RETURNING *`,
      [vendor_id, code, title, description, discount_type, discount_value, valid_from, valid_until, tracking_url, is_active, id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Update coupon error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await query("DELETE FROM coupons WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
