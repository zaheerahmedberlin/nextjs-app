// app/page.jsx — Server Component: pre-fetches initial data for LCP improvement
import { unstable_cache } from "next/cache";
import { query } from "@/lib/db";
import { buildCategoryTree } from "@/lib/categoryTree";
import HomeClient from "@/components/HomeClient";

// In-process memory cache — no Redis network overhead, revalidates every 5 min
const getInitialData = unstable_cache(
  async () => {
    const [priceRes, prodRes, catRes, countRes] = await Promise.all([
      query(`SELECT MAX(price) AS max FROM products WHERE is_active = TRUE AND in_stock = TRUE`),
      query(`
      WITH ranked AS (
        SELECT
          p.id, p.title, p.description, p.image, p.url,
          p.price, p.old_price, p.currency,
          p.category, p.ean,
          v.name AS vendor, v.logo_url AS vendor_logo,
          p.in_stock, p.is_active,
          p.active_from, p.active_until, p.updated_at, p.created_at,
          ROW_NUMBER() OVER (PARTITION BY p.vendor_id ORDER BY p.price ASC) AS vendor_rank
        FROM products p
        LEFT JOIN vendors v ON v.id = p.vendor_id
        WHERE p.is_active = TRUE AND p.in_stock = TRUE
          AND p.price >= 15
          AND p.image IS NOT NULL AND p.image != ''
      )
      SELECT * FROM ranked
      WHERE vendor_rank <= 2
      ORDER BY price ASC
      LIMIT 12`),
      query(`SELECT
        c.id, c.slug, c.name, c.parent_id, c.icon, c.sort_order,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id AND p.is_active = TRUE AND p.in_stock = TRUE
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.parent_id NULLS FIRST, c.sort_order, c.name`),
      query(`SELECT COUNT(*) AS total FROM products p
      WHERE p.is_active = TRUE AND p.in_stock = TRUE
        AND p.price >= 15
        AND p.image IS NOT NULL AND p.image != ''`),
    ]);

    const rawMax = parseFloat(priceRes.rows[0]?.max) || 10000;
    const initialMaxPrice = Math.ceil(rawMax / 100) * 100;
    const initialTotalProducts = parseInt(countRes.rows[0]?.total) || 0;

    // Vendor diversity (max 2 per vendor) is already enforced by the
    // window-function query above.
    const initialProducts = prodRes.rows;

    const rows = catRes.rows.map((r) => ({
      id:           r.id,
      slug:         r.slug,
      name:         r.name,
      parentId:     r.parent_id,
      icon:         r.icon,
      productCount: parseInt(r.product_count),
    }));
    const initialCategories = buildCategoryTree(rows);

    return { initialProducts, initialMaxPrice, initialCategories, initialTotalProducts };
  },
  ["homepage-initial-data"],
  { revalidate: 300 } // refresh every 5 minutes
);

export const dynamic = "force-dynamic";

export default async function Page() {
  let data = { initialProducts: [], initialMaxPrice: 10000, initialCategories: [], initialTotalProducts: 0 };
  try {
    data = await getInitialData();
  } catch (e) {
    console.error("SSR prefetch failed:", e.message);
  }

  return (
    <HomeClient
      initialProducts={data.initialProducts}
      initialMaxPrice={data.initialMaxPrice}
      initialCategories={data.initialCategories}
      initialTotalProducts={data.initialTotalProducts}
    />
  );
}
