// PATCH /api/admin/vendors/[id]  — update vendor
// DELETE /api/admin/vendors/[id] — deactivate vendor
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { name, website_url, logo_url, contact_email, billing_rate, is_active, member_since } = await request.json();
    const { id } = await params;

    const result = await query(
      `UPDATE vendors SET
        name           = COALESCE($1, name),
        website_url    = COALESCE($2, website_url),
        logo_url       = COALESCE($3, logo_url),
        contact_email  = COALESCE($4, contact_email),
        billing_rate   = COALESCE($5, billing_rate),
        is_active      = COALESCE($6, is_active),
        member_since   = COALESCE($7, member_since)
      WHERE id = $8 RETURNING *`,
      [name, website_url, logo_url, contact_email, billing_rate, is_active, member_since, id]
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Update vendor error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  // Soft delete — deactivate rather than remove (preserves click history)
  await query("UPDATE vendors SET is_active = FALSE WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
