// app/api/search/route.js
// GET /api/search?q=laptop
// Autocomplete / instant search suggestions — fast, cached, ES-first
import { query } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { esClient, PRODUCTS_INDEX } from "@/lib/elasticsearch";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) return NextResponse.json([]);

  const cacheKey = `search:suggest:${q.toLowerCase()}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  // ── Try ElasticSearch autocomplete ───────────────────────
  if (esClient) {
    try {
      const result = await esClient.search({
        index: PRODUCTS_INDEX,
        size: 8,
        query: {
          multi_match: {
            query: q,
            fields: ["title^3", "category^2"],
            type: "phrase_prefix",
          },
        },
        _source: ["title", "category", "price", "image"],
      });

      const suggestions = result.hits.hits.map((h) => ({
        title: h._source.title,
        category: h._source.category,
        price: h._source.price,
        image: h._source.image,
      }));

      await cacheSet(cacheKey, suggestions, 120); // cache 2 min
      return NextResponse.json(suggestions);
    } catch {
      // fall through to PG
    }
  }

  // ── Fallback: PostgreSQL trigram search ───────────────────
  try {
    const result = await query(`
      SELECT DISTINCT title, category, price, image
      FROM products
      WHERE title ILIKE $1
        AND is_active = TRUE
      ORDER BY price ASC
      LIMIT 8
    `, [`%${q}%`]);

    const suggestions = result.rows;
    await cacheSet(cacheKey, suggestions, 120);
    return NextResponse.json(suggestions);
  } catch (err) {
    console.error("Search suggest error:", err);
    return NextResponse.json([]);
  }
}
