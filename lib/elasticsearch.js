// lib/elasticsearch.js
// ─────────────────────────────────────────────────────────────
// ElasticSearch client for full-text product search.
// Used for the search bar — much faster and more relevant
// than SQL ILIKE queries for large product catalogues.
//
// Falls back to PostgreSQL if ES is unavailable.
// ─────────────────────────────────────────────────────────────
import { Client } from "@elastic/elasticsearch";

let esClient;

try {
  esClient = new Client({
    node: process.env.ELASTICSEARCH_URL || "http://localhost:9200",
    auth: process.env.ELASTICSEARCH_API_KEY
      ? { apiKey: process.env.ELASTICSEARCH_API_KEY }
      : undefined,
    tls: process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
  });
} catch {
  esClient = null;
}

export { esClient };

// ── Index name ────────────────────────────────────────────────
export const PRODUCTS_INDEX = "preisgucken_products";

// ── Search products in ElasticSearch ─────────────────────────
export async function searchProducts({ q, category, maxPrice, sort, page = 1, limit = 24, inStockOnly, includeInactive, activeFrom, activeUntil }) {
  if (!esClient) return null; // caller will fall back to DB

  const from = (page - 1) * limit;

  const must = [];
  const filter = [];

  if (q) {
    must.push({
      multi_match: {
        query: q,
        fields: ["title^3", "description^1", "category^2", "vendor^1"],
        type: "best_fields",
        fuzziness: "AUTO",
      },
    });
  } else {
    must.push({ match_all: {} });
  }

  if (category)              filter.push({ term:  { "category.keyword": category } });
  if (maxPrice)              filter.push({ range: { price: { lte: parseFloat(maxPrice) } } });
  if (!includeInactive)      filter.push({ term:  { is_active: true } });
  if (inStockOnly)           filter.push({ term:  { in_stock: true } });
  if (activeFrom)            filter.push({ range: { active_from:  { gte: activeFrom } } });
  if (activeUntil)           filter.push({ range: { active_until: { lte: activeUntil } } });

  const esSort =
    sort === "priceAsc"  ? [{ price: "asc" }]  :
    sort === "priceDesc" ? [{ price: "desc" }] :
    [{ _score: "desc" }];

  try {
    const result = await esClient.search({
      index: PRODUCTS_INDEX,
      from,
      size: limit,
      query: { bool: { must, filter } },
      sort: esSort,
      _source: ["id", "title", "description", "price", "image", "category", "vendor", "url", "ean", "in_stock", "is_active", "active_from", "active_until"],
      track_total_hits: true,
    });

    const hits = result.hits.hits.map((h) => ({ id: h._id, ...h._source }));
    const total = result.hits.total.value;

    return { products: hits, total, pageCount: Math.ceil(total / limit) };
  } catch (err) {
    console.error("ElasticSearch error:", err.message);
    return null; // fall back to DB
  }
}

// ── Index a single product into ElasticSearch ─────────────────
export async function indexProduct(product) {
  if (!esClient) return;
  try {
    await esClient.index({
      index: PRODUCTS_INDEX,
      id: String(product.id),
      document: {
        title:       product.title,
        description: product.description,
        price:       product.price,
        image:       product.image,
        category:    product.category,
        vendor:      product.vendor,
        url:         product.url,
        ean:         product.ean,
        updated_at:  new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("ES index error:", err.message);
  }
}

// ── Create the index with German analyzer ─────────────────────
// Run this once: node scripts/create-es-index.js
export async function createProductsIndex() {
  if (!esClient) return;
  const exists = await esClient.indices.exists({ index: PRODUCTS_INDEX });
  if (exists) return;

  await esClient.indices.create({
    index: PRODUCTS_INDEX,
    settings: {
      analysis: {
        analyzer: {
          german_custom: {
            type: "custom",
            tokenizer: "standard",
            filter: ["lowercase", "german_stop", "german_stemmer"],
          },
        },
        filter: {
          german_stop:    { type: "stop",   stopwords: "_german_" },
          german_stemmer: { type: "stemmer", language: "light_german" },
        },
      },
    },
    mappings: {
      properties: {
        title:       { type: "text",    analyzer: "german_custom", fields: { keyword: { type: "keyword" } } },
        description: { type: "text",    analyzer: "german_custom" },
        category:    { type: "keyword", fields: { text: { type: "text" } } },
        vendor:      { type: "keyword" },
        price:       { type: "float" },
        image:       { type: "keyword", index: false },
        url:         { type: "keyword", index: false },
        ean:         { type: "keyword" },
        updated_at:  { type: "date" },
      },
    },
  });
  console.log("Created ES index:", PRODUCTS_INDEX);
}
