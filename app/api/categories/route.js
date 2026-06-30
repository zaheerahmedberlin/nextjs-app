// GET /api/categories — returns category tree with product counts
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  const cacheKey = "categories:tree";
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const result = await query(`
      SELECT
        c.id,
        c.slug,
        c.name,
        c.parent_id,
        c.icon,
        c.sort_order,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.parent_id NULLS FIRST, c.sort_order, c.name
    `);

    const rows = result.rows.map((r) => ({
      id:           r.id,
      slug:         r.slug,
      name:         r.name,
      parentId:     r.parent_id,
      icon:         r.icon,
      productCount: parseInt(r.product_count),
    }));

    // Build tree: parents with children array
    const parents  = rows.filter((r) => !r.parentId);
    const children = rows.filter((r) =>  r.parentId);

    const tree = parents.map((parent) => ({
      ...parent,
      children: children.filter((c) => c.parentId === parent.id),
    }));

    await cacheSet(cacheKey, tree, 3600);
    return NextResponse.json(tree);
  } catch (err) {
    console.error("Categories API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
