// lib/categoryTree.js
// Builds an arbitrary-depth category tree from a flat row list (each row
// needs at least { id, parentId, productCount }). Product counts always
// roll up as a true total: own count + the full (already-totaled) sum of
// every descendant, never an either/or choice between them. A pure
// either/or was tried twice and broke in both directions: summing
// children only (the original bug) showed Küche as "14" instead of its
// real ~6,900 own products; showing own-count-only when non-zero (the
// first fix) then hid Elektroinstallation's ~12,500 products spread
// across Schalter/Sicherungen/Smart-Home subcategories behind its small
// 637-item leftover bucket (found 2026-08-22). Own products and child
// products are always disjoint (a product has exactly one category_id),
// so summing them is a clean total with no double-counting risk.
export function buildCategoryTree(rows, parentId = null) {
  return rows
    .filter((r) => (r.parentId ?? null) === parentId)
    .map((node) => {
      const children = buildCategoryTree(rows, node.id);
      const childrenCount = children.reduce((sum, c) => sum + c.productCount, 0);
      return {
        ...node,
        productCount: node.productCount + childrenCount,
        // priceP95/priceMax pass through as-is (node.priceP95/priceMax) —
        // computed server-side per category (backfill_category_price_stats.py),
        // no extra rollup needed here.
        children,
      };
    });
}
