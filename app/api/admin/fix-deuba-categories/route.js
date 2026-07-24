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

    // Sample titles from Sonstiges products to determine keyword mapping
    const sonstiges = await query(
      `SELECT p.id, p.title
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.vendor_id = $1 AND c.slug = 'sonstiges'
       ORDER BY p.title
       LIMIT 100`,
      [vendorId]
    );

    return NextResponse.json({
      vendor: { id: vendorId, name: vendorName },
      categoryDistribution: dist.rows,
      sonstigesSample: sonstiges.rows,
    });
  } catch (err) {
    console.error("fix-deuba GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Keyword rules: checked in order, first match wins
// Each product in Sonstiges gets the first matching category
const KEYWORD_RULES = [
  { keywords: ["babyfußsack", "baby"],                                        slug: "baby-world"   },
  { keywords: ["aufbewahrungsbox", "aufbewahrung"],                           slug: "aufbewahrung" },
  { keywords: ["beeteinfassung", "blumentopf", "bollerwagen", "wäschespinne",
               "briefkasten", "hochbeet", "blumenkasten", "pflanzkasten"],    slug: "gartenmoebel" },
  { keywords: ["puzzlematte", "puzzlematten", "bodenschutz", "basketballkorb",
               "hantelbank", "hanteln", "fitness"],                           slug: "gesundheit"   },
];

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { apply = false } = await request.json();

    const vendor = await query(
      `SELECT id FROM vendors WHERE name ILIKE '%deuba%' LIMIT 1`
    );
    if (!vendor.rows[0]) return NextResponse.json({ error: "DeubaXXL vendor not found" }, { status: 404 });
    const vendorId = vendor.rows[0].id;

    // Resolve all needed slugs to IDs in one query
    const slugList = [...new Set(KEYWORD_RULES.map((r) => r.slug))];
    const catRows = await query(
      `SELECT id, slug FROM categories WHERE slug = ANY($1)`, [slugList]
    );
    const slugToId = Object.fromEntries(catRows.rows.map((r) => [r.slug, r.id]));

    // Fetch all Sonstiges products for this vendor
    const sonstigesId = (await query(
      `SELECT id FROM categories WHERE slug = 'sonstiges' LIMIT 1`
    )).rows[0]?.id;

    const products = await query(
      `SELECT id, title FROM products WHERE vendor_id = $1 AND category_id = $2`,
      [vendorId, sonstigesId]
    );

    // Classify each product by keyword matching
    const assignments = {}; // category_id → [product_ids]
    let unmatched = 0;

    for (const product of products.rows) {
      const titleLower = product.title.toLowerCase();
      let matched = false;

      for (const rule of KEYWORD_RULES) {
        if (rule.keywords.some((kw) => titleLower.includes(kw))) {
          const catId = slugToId[rule.slug];
          if (!assignments[catId]) assignments[catId] = [];
          assignments[catId].push(product.id);
          matched = true;
          break;
        }
      }

      if (!matched) unmatched++;
    }

    // Build preview
    const preview = Object.entries(assignments).map(([catId, ids]) => {
      const slug = Object.entries(slugToId).find(([s, id]) => String(id) === catId)?.[0];
      return { category_slug: slug, category_id: parseInt(catId), products_to_move: ids.length };
    });

    if (!apply) {
      return NextResponse.json({ dry_run: true, preview, unmatched_stay_in_sonstiges: unmatched });
    }

    // Apply
    const results = [];
    for (const [catId, ids] of Object.entries(assignments)) {
      const upd = await query(
        `UPDATE products SET category_id = $1 WHERE id = ANY($2)`,
        [parseInt(catId), ids]
      );
      const slug = Object.entries(slugToId).find(([s, id]) => String(id) === catId)?.[0];
      results.push({ category_slug: slug, updated: upd.rowCount });
    }

    // Bust Redis cache
    try {
      const { cacheSet } = await import("@/lib/redis");
      await Promise.all([
        cacheSet("ssr:homepage:v1", null, 1),
        cacheSet("categories:tree", null, 1),
      ]);
    } catch {}

    return NextResponse.json({ applied: true, results, unmatched_stayed_in_sonstiges: unmatched });
  } catch (err) {
    console.error("fix-deuba POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
