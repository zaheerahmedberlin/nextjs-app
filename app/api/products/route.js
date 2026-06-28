// app/api/products/route.js
import { query, paginate } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { searchProducts } from "@/lib/elasticsearch";
import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const q               = searchParams.get("q")?.trim() ?? "";
  const category        = searchParams.get("category") ?? "";
  const maxPrice        = parseFloat(searchParams.get("maxPrice") ?? "999999");
  const sort            = searchParams.get("sort") ?? "relevance";
  const page            = parseInt(searchParams.get("page") ?? "1");
  const limit           = Math.min(parseInt(searchParams.get("limit") ?? "24"), 100);
  const inStockOnly     = searchParams.get("inStockOnly") !== "false";
  const includeInactive = searchParams.get("includeInactive") === "true";
  const activeFrom      = searchParams.get("activeFrom")  ?? "";
  const activeUntil     = searchParams.get("activeUntil") ?? "";

  const cacheKey = `products:${q}:${category}:${maxPrice}:${sort}:${page}:${limit}:${inStockOnly}:${includeInactive}:${activeFrom}:${activeUntil}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  const esResult = await searchProducts({ q, category, maxPrice, sort, page, limit, inStockOnly, includeInactive, activeFrom, activeUntil });
  if (esResult) {
    await cacheSet(cacheKey, esResult, 300);
    return NextResponse.json({ ...esResult, source: "elasticsearch" });
  }

  try {
    const { limit: pgLimit, offset } = paginate(page, limit);
    const params = [];
    const conditions = [];

    if (!includeInactive) conditions.push("p.is_active = TRUE");

    if (activeFrom) {
      params.push(activeFrom);
      conditions.push(`p.active_from >= $${params.length}::DATE`);
    }
    if (activeUntil) {
      params.push(activeUntil);
      conditions.push(`(p.active_until IS NULL OR p.active_until <= ($${params.length}::DATE + INTERVAL '1 day'))`);
    }

    if (inStockOnly) conditions.push("p.in_stock = TRUE");

    if (q) {
      params.push(q);
      conditions.push(`p.search_vector @@ plainto_tsquery('german', unaccent($${params.length}))`);
    }

    if (category) {
      params.push(category);
      conditions.push(`p.category = $${params.length}`);
    }

    if (maxPrice < 999999) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderBy =
      sort === "priceAsc"  ? "p.price ASC"  :
      sort === "priceDesc" ? "p.price DESC" :
      q ? "ts_rank(p.search_vector, plainto_tsquery('german', unaccent($1))) DESC" :
      "p.updated_at DESC";

    const countResult = await query(`SELECT COUNT(*) FROM products p ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(pgLimit, offset);
    const dataResult = await query(
      `SELECT
        p.id, p.title, p.description, p.image, p.url,
        p.price, p.old_price, p.currency,
        p.category, p.vendor, p.ean,
        p.in_stock, p.is_active,
        p.active_from, p.active_until, p.updated_at
      FROM products p
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const result = {
      products: dataResult.rows,
      total,
      page,
      pageCount: Math.ceil(total / pgLimit),
      source: "postgresql",
    };

    await cacheSet(cacheKey, result, 300);
    return NextResponse.json(result);

  } catch (err) {
    console.error("Products API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
