// PATCH  /api/admin/coupons/[id] — update a coupon
// DELETE /api/admin/coupons/[id] — remove a coupon (hard delete — no click history tied to a coupon row itself)
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

const EDITABLE_COLUMNS = [
  "vendor_id", "code", "title", "description",
  "discount_type", "discount_value",
  "valid_from", "valid_until", "tracking_url", "is_active",
];

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { id } = await params;

    // Only touch fields the caller actually sent. A COALESCE-based UPDATE
    // can't distinguish "field omitted" (leave unchanged — e.g. the
    // Aktivieren/Deaktivieren toggle only sends is_active) from "field
    // explicitly set to null" (e.g. clearing valid_until to make a coupon
    // permanent) — both collapse to null over the wire, and COALESCE
    // always falls back to the existing value either way, so an explicit
    // clear could never actually take effect. Checking which keys are
    // present in the request body (not just their values) fixes that.
    const setClauses = [];
    const values = [];
    for (const col of EDITABLE_COLUMNS) {
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        values.push(body[col]);
        setClauses.push(`${col} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    const result = await query(
      `UPDATE coupons SET ${setClauses.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
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
