// PATCH /api/admin/categories/[id]
// DELETE /api/admin/categories/[id]
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { name, slug, parent_id, icon, sort_order, is_active } = await request.json();

  const result = await query(
    `UPDATE categories SET
      name       = COALESCE($1, name),
      slug       = COALESCE($2, slug),
      parent_id  = COALESCE($3, parent_id),
      icon       = COALESCE($4, icon),
      sort_order = COALESCE($5, sort_order),
      is_active  = COALESCE($6, is_active)
    WHERE id = $7 RETURNING *`,
    [name, slug, parent_id, icon, sort_order, is_active, id]
  );
  if (!result.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  // Move orphaned products to Sonstiges before deleting
  await query(`
    UPDATE products SET category_id = (SELECT id FROM categories WHERE slug='sonstiges')
    WHERE category_id = $1
  `, [id]);
  await query("DELETE FROM categories WHERE id = $1", [id]);
  return NextResponse.json({ ok: true });
}
