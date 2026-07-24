// GET  — audit: show DeubaXXL category distribution + available categories + existing mappings
// POST { apply: false } — dry run: show what changes would be made
// POST { apply: true  } — apply the fix

import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  // Find DeubaXXL vendor
  const vendor = await query(
    `SELECT id, name FROM vendors WHERE name ILIKE '%deuba%' LIMIT 1`
  );
  if (!vendor.rows[0]) return NextResponse.json({ error: "DeubaXXL vendor not found" }, { status: 404 });
  const { id: vendorId, name: vendorName } = vendor.rows[0];

  // Category distribution of DeubaXXL products
  const dist = await query(
    `SELECT
       p.category                            AS raw_category,
       c.slug                                AS current_category_slug,
       c.name                                AS current_category_name,
       COUNT(*)::int                         AS product_count
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.vendor_id = $1
     GROUP BY p.category, c.slug, c.name
     ORDER BY COUNT(*) DESC`,
    [vendorId]
  );

  // All available categories
  const categories = await query(
    `SELECT id, slug, name, parent_id FROM categories WHERE is_active = TRUE ORDER BY parent_id NULLS FIRST, sort_order, name`
  );

  // Existing vendor_category_mappings for DeubaXXL
  const mappings = await query(
    `SELECT vcm.vendor_category, c.slug, c.name
     FROM vendor_category_mappings vcm
     JOIN categories c ON c.id = vcm.category_id
     WHERE vcm.vendor_id = $1`,
    [vendorId]
  );

  return NextResponse.json({
    vendor: { id: vendorId, name: vendorName },
    categoryDistribution: dist.rows,
    availableCategories: categories.rows,
    existingMappings: mappings.rows,
  });
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { apply = false, mappings: userMappings } = await request.json();
  // userMappings: [{ raw_category: "Gartenmöbel", category_slug: "outdoor" }, ...]

  if (!userMappings || !Array.isArray(userMappings) || userMappings.length === 0) {
    return NextResponse.json({ error: "mappings array required" }, { status: 400 });
  }

  // Find DeubaXXL vendor
  const vendor = await query(
    `SELECT id, name FROM vendors WHERE name ILIKE '%deuba%' LIMIT 1`
  );
  if (!vendor.rows[0]) return NextResponse.json({ error: "DeubaXXL vendor not found" }, { status: 404 });
  const vendorId = vendor.rows[0].id;

  // Resolve category slugs to IDs
  const slugList = [...new Set(userMappings.map((m) => m.category_slug))];
  const catRows = await query(
    `SELECT id, slug FROM categories WHERE slug = ANY($1)`,
    [slugList]
  );
  const slugToId = Object.fromEntries(catRows.rows.map((r) => [r.slug, r.id]));

  // Validate all slugs resolved
  const missing = slugList.filter((s) => !slugToId[s]);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Unknown category slugs: ${missing.join(", ")}` }, { status: 400 });
  }

  // Preview changes
  const preview = [];
  for (const m of userMappings) {
    const categoryId = slugToId[m.category_slug];
    const affected = await query(
      `SELECT COUNT(*)::int AS count FROM products
       WHERE vendor_id = $1 AND category = $2 AND (category_id IS NULL OR category_id != $3)`,
      [vendorId, m.raw_category, categoryId]
    );
    preview.push({
      raw_category: m.raw_category,
      target_slug: m.category_slug,
      category_id: categoryId,
      products_to_update: affected.rows[0].count,
    });
  }

  if (!apply) {
    return NextResponse.json({ dry_run: true, preview });
  }

  // Apply: update products + upsert vendor_category_mappings
  const results = [];
  for (const m of userMappings) {
    const categoryId = slugToId[m.category_slug];

    // Update products
    const upd = await query(
      `UPDATE products
       SET category_id = $1
       WHERE vendor_id = $2 AND category = $3`,
      [categoryId, vendorId, m.raw_category]
    );

    // Upsert mapping so future uploads auto-resolve
    await query(
      `INSERT INTO vendor_category_mappings (vendor_id, vendor_category, category_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (vendor_id, vendor_category) DO UPDATE SET category_id = EXCLUDED.category_id`,
      [vendorId, m.raw_category, categoryId]
    );

    results.push({
      raw_category: m.raw_category,
      target_slug: m.category_slug,
      products_updated: upd.rowCount,
    });
  }

  // Invalidate Redis cache so homepage/categories refresh immediately
  try {
    const { cacheSet } = await import("@/lib/redis");
    await cacheSet("ssr:homepage:v1", null, 1);
    await cacheSet("categories:tree", null, 1);
  } catch {}

  return NextResponse.json({ applied: true, results });
}
