// lib/categoryTree.js
// Builds an arbitrary-depth category tree from a flat row list (each row
// needs at least { id, parentId, productCount }). Product counts roll up
// bottom-up ONLY when the node has none of its own — a parent with real
// direct products (e.g. Küche has ~6,900 products classified straight
// into it, not into its Kaffeemaschinen/Wasserkocher/... subcategories)
// shows its own count, not a sum of children that would badly undercount
// it. A leaf, or a parent that's purely organizational with nothing of
// its own, falls back to the children's sum. Mirrors the same
// conditional-rollup rule already used for the API route and category
// page's pill counts (found 2026-08-19: Küche showed "14" instead of
// 6,910 because this was the one place still summing children first).
export function buildCategoryTree(rows, parentId = null) {
  return rows
    .filter((r) => (r.parentId ?? null) === parentId)
    .map((node) => {
      const children = buildCategoryTree(rows, node.id);
      const childrenCount = children.reduce((sum, c) => sum + c.productCount, 0);
      return {
        ...node,
        productCount: node.productCount > 0 ? node.productCount : childrenCount,
        // priceP95/priceMax pass through as-is (node.priceP95/priceMax) —
        // already computed with the same own-vs-rollup logic server-side
        // (backfill_category_price_stats.py), no extra rollup needed here.
        children,
      };
    });
}
