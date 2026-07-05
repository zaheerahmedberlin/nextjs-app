import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

// PATCH /api/admin/vendors/[id]/products — pause or resume all products for a vendor
export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { is_active } = await request.json();

  await query(
    "UPDATE products SET is_active = $1 WHERE vendor_id = $2",
    [is_active, id]
  );

  const { rows } = await query(
    "SELECT COUNT(*) as count FROM products WHERE vendor_id = $1",
    [id]
  );

  return NextResponse.json({ ok: true, affected: parseInt(rows[0].count) });
}
