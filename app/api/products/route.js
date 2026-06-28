// app/api/products/route.js
import { db } from "@/lib/db";

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const q        = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const maxPrice = searchParams.get("maxPrice") || 999999;
    const sort     = searchParams.get("sort") || "relevance";
    const page     = parseInt(searchParams.get("page") || "1");
    const limit    = 24;
    const offset   = (page - 1) * limit;

    const products = await db.query(`
    SELECT * FROM products
    WHERE title ILIKE $1
    AND ($2 = '' OR category = $2)
    AND price <= $3
    ORDER BY ${sort === "priceAsc" ? "price ASC" : sort === "priceDesc" ? "price DESC" : "relevance DESC"}
    LIMIT $4 OFFSET $5
  `, [`%${q}%`, category, maxPrice, limit, offset]);

    return Response.json({ products: products.rows });
}