// lib/categoryTree.js
// Builds an arbitrary-depth category tree from a flat row list (each row
// needs at least { id, parentId, productCount }). Product counts roll up
// bottom-up: a node with children shows the sum of its children's counts;
// a leaf shows its own.
export function buildCategoryTree(rows, parentId = null) {
  return rows
    .filter((r) => (r.parentId ?? null) === parentId)
    .map((node) => {
      const children = buildCategoryTree(rows, node.id);
      const childrenCount = children.reduce((sum, c) => sum + c.productCount, 0);
      return {
        ...node,
        productCount: childrenCount > 0 ? childrenCount : node.productCount,
        children,
      };
    });
}
