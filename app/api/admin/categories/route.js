// GET  /api/admin/categories — full tree with vendor mappings
// POST /api/admin/categories — create category
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const cats = await query(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id ORDER BY c.parent_id NULLS FIRST, c.sort_order, c.name
  `);

  const mappings = await query(`
    SELECT vcm.*, v.name AS vendor_name, c.name AS category_name
    FROM vendor_category_mappings vcm
    JOIN vendors v ON v.id = vcm.vendor_id
    JOIN categories c ON c.id = vcm.category_id
    ORDER BY v.name, vcm.vendor_category
  `);

  return NextResponse.json({ categories: cats.rows, mappings: mappings.rows });
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { name, slug, parent_id, icon, sort_order } = await request.json();
  if (!name || !slug) return NextResponse.json({ error: "name and slug required" }, { status: 400 });

  try {
    const result = await query(
      `INSERT INTO categories (name, slug, parent_id, icon, sort_order)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, slug, parent_id || null, icon || null, sort_order ?? 0]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    if (err.code === "23505") return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
