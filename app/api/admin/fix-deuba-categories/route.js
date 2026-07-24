// GET  — audit: show DeubaXXL category distribution + available categories
// POST { apply: false, mappings: [...] } — dry run
// POST { apply: true,  mappings: [...] } — apply

import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const vendor = await query(
      `SELECT id, name FROM vendors WHERE name ILIKE '%deuba%' LIMIT 1`
    );
    if (!vendor.rows[0]) return NextResponse.json({ error: "DeubaXXL vendor not found" }, { status: 404 });
    const { id: vendorId, name: vendorName } = vendor.rows[0];

    const dist = await query(
      `SELECT
         p.category                AS raw_category,
         c.slug                    AS current_slug,
         c.name                    AS current_name,
         COUNT(*)::int             AS product_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.vendor_id = $1
       GROUP BY p.category, c.slug, c.name
       ORDER BY COUNT(*) DESC`,
      [vendorId]
    );

    const categories = await query(
      `SELECT id, slug, name, parent_id
       FROM categories WHERE is_active = TRUE
       ORDER BY parent_id NULLS FIRST, sort_order, name`
    );

    return NextResponse.json({
      vendor: { id: vendorId, name: vendorName },
      categoryDistribution: dist.rows,
      availableCategories: categories.rows,
    });
  } catch (err) {
    console.error("fix-deuba GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { apply = false, mappings: userMappings } = await request.json();

    if (!userMappings || !Array.isArray(userMappings) || userMappings.length === 0) {
      return NextResponse.json({ error: "mappings array required" }, { status: 400 });
    }

    const vendor = await query(
      `SELECT id FROM vendors WHERE name ILIKE '%deuba%' LIMIT 1`
    );
    if (!vendor.rows[0]) return NextResponse.json({ error: "DeubaXXL vendor not found" }, { status: 404 });
    const vendorId = vendor.rows[0].id;

    const slugList = [...new Set(userMappings.map((m) => m.category_slug))];
    const catRows = await query(
      `SELECT id, slug FROM categories WHERE slug = ANY($1)`, [slugList]
    );
    const slugToId = Object.fromEntries(catRows.rows.map((r) => [r.slug, r.id]));

    const missing = slugList.filter((s) => !slugToId[s]);
    if (missing.length) {
      return NextResponse.json({ error: `Unknown slugs: ${missing.join(", ")}` }, { status: 400 });
    }

    const preview = [];
    for (const m of userMappings) {
      const categoryId = slugToId[m.category_slug];
      const affected = await query(
        `SELECT COUNT(*)::int AS count FROM products
         WHERE vendor_id = $1 AND category = $2`,
        [vendorId, m.raw_category]
      );
      preview.push({
        raw_category: m.raw_category,
        target_slug: m.category_slug,
        products_to_update: affected.rows[0].count,
      });
    }

    if (!apply) return NextResponse.json({ dry_run: true, preview });

    const results = [];
    for (const m of userMappings) {
      const categoryId = slugToId[m.category_slug];
      const upd = await query(
        `UPDATE products SET category_id = $1 WHERE vendor_id = $2 AND category = $3`,
        [categoryId, vendorId, m.raw_category]
      );
      results.push({ raw_category: m.raw_category, target_slug: m.category_slug, updated: upd.rowCount });
    }

    // Bust Redis cache
    try {
      const { cacheSet } = await import("@/lib/redis");
      await Promise.all([
        cacheSet("ssr:homepage:v1", null, 1),
        cacheSet("categories:tree", null, 1),
      ]);
    } catch {}

    return NextResponse.json({ applied: true, results });
  } catch (err) {
    console.error("fix-deuba POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
