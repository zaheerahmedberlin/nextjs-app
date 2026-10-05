// lib/categoryCounts.js
// One cached query for the whole category tree with rolled-up product counts.
// Category pages use it for parent/sibling links. It replaced a per-page
// recursive EXISTS over every sibling, which pushed `/kategorie/gesundheit`
// (30 top-level siblings) past the 60 s static-generation limit on the
// production build.
import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";
import { buildCategoryTree } from "@/lib/categoryTree";

async function loadFlatTree() {
  const res = await query(
    `SELECT c.id, c.slug, c.name, c.parent_id, c.sort_order, COUNT(p.id)::int AS product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
     WHERE c.is_active = TRUE
     GROUP BY c.id`
  );
  return res.rows.map((r) => ({
    id: r.id, slug: r.slug, name: r.name, parentId: r.parent_id, sortOrder: r.sort_order, productCount: r.product_count,
  }));
}

export const getFlatCategoryTree = unstable_cache(loadFlatTree, ["flat-category-tree-v1"], { revalidate: 3600 });

// Parent + siblings (with products in their subtree) for one category.
export async function getRelatedCategories(categoryId) {
  const flat = await getFlatCategoryTree();
  const self = flat.find((r) => r.id === categoryId);
  if (!self) return { parent: null, siblings: [] };
  const parent = self.parentId != null ? flat.find((r) => r.id === self.parentId) : null;
  const rolled = buildCategoryTree(flat, self.parentId ?? null);
  const siblings = rolled
    .filter((n) => n.id !== categoryId && n.productCount > 0 && n.slug !== "sonstiges")
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name, "de"))
    .slice(0, 14)
    .map((n) => ({ slug: n.slug, name: n.name }));
  return { parent: parent ? { slug: parent.slug, name: parent.name } : null, siblings };
}
