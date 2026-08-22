// app/api/products/route.js
import { query, paginate } from "@/lib/db";
import { cacheGet, cacheSet } from "@/lib/redis";
import { searchProducts } from "@/lib/elasticsearch";
import { NextResponse } from "next/server";

export const revalidate = 0;

// Match against the TITLE only, not p.search_vector (which also indexes the
// description) — a term appearing only in body copy (e.g. a dog ramp's
// description mentioning "reaches the sofa") isn't a relevant result. This
// matters most when sort overrides relevance ranking (priceAsc/priceDesc):
// irrelevant description-only matches would otherwise surface at the top
// just for being cheap. Prefix matching: split words and append :* to each
// for partial word support, e.g. "matrat" matches "Matratzen". Strip
// everything but letters/digits from each word first — tsquery's own
// operator characters (: & | ( ) !) pass straight through otherwise, and a
// bare "&" or "(" in the search box broke to_tsquery's parser with a 500
// instead of just matching nothing.
// paramIdx is the 1-based position of the search term in the query's params
// array — this condition consumes two consecutive placeholders ($paramIdx
// for the tsquery match, $paramIdx+1 for the ILIKE fallback), both bound to
// the same search term value by the caller.
function titleSearchCondition(paramIdx) {
  return `(
    to_tsvector('german', immutable_unaccent(p.title)) @@ to_tsquery('german', array_to_string(
      ARRAY(SELECT unaccent(w) || ':*'
            FROM (SELECT regexp_replace(word, '[^[:alnum:]]', '', 'g') AS w
                  FROM unnest(regexp_split_to_array(trim($${paramIdx}), '\\s+')) AS word) sub
            WHERE w <> ''),
      ' & '
    ))
    OR p.title ILIKE $${paramIdx + 1}
  )`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const q               = searchParams.get("q")?.trim() ?? "";
  const category        = searchParams.get("category") ?? "";
  const maxPrice        = parseFloat(searchParams.get("maxPrice") ?? "999999");
  const minPrice        = parseFloat(searchParams.get("minPrice") ?? "0");
  const sort            = searchParams.get("sort") ?? "relevance";
  const page            = parseInt(searchParams.get("page") ?? "1");
  const limit           = Math.min(parseInt(searchParams.get("limit") ?? "24"), 100);
  const inStockOnly     = searchParams.get("inStockOnly") !== "false";
  const includeInactive = searchParams.get("includeInactive") === "true";
  const vendor          = searchParams.get("vendor")?.trim() ?? "";
  const perVendorLimit  = parseInt(searchParams.get("perVendorLimit") ?? "0");
  const premiumOnly     = searchParams.get("premiumOnly") === "true";
  const excludeCategory = searchParams.get("excludeCategory") ?? "";

  const cacheKey = `products:${q}:${category}:${minPrice}:${maxPrice}:${sort}:${page}:${limit}:${inStockOnly}:${includeInactive}:${vendor}:${perVendorLimit}:${premiumOnly}:${excludeCategory}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json({ ...cached, source: "cache" });

  // ElasticSearch doesn't know about perVendorLimit or premiumOnly (Postgres-only
  // features) — skip it for those queries rather than silently ignoring the filter.
  const esResult = (perVendorLimit > 0 || premiumOnly)
    ? null
    : await searchProducts({ q, category, minPrice, maxPrice, sort, page, limit, inStockOnly, includeInactive });
  if (esResult) {
    await cacheSet(cacheKey, esResult, 300);
    return NextResponse.json({ ...esResult, source: "elasticsearch" });
  }

  try {
    const { limit: pgLimit, offset } = paginate(page, limit);
    const params = [];
    const conditions = [];

    if (!includeInactive) conditions.push("p.is_active = TRUE");

    // Exclude free/misconfigured listings (e.g. promotional giveaway items
    // bundled in a vendor feed) — a €0 price isn't a real comparable offer
    // and would otherwise always sort first under "cheapest offers".
    conditions.push("p.price > 0");

    // Products without an image look broken in listings — exclude sitewide.
    conditions.push("p.image IS NOT NULL AND p.image != ''");

    if (inStockOnly) conditions.push("p.in_stock = TRUE");

    if (q) {
      params.push(q);
      const qIdx = params.length;
      conditions.push(titleSearchCondition(qIdx));
      params.push(`%${q}%`);
    }

    if (category) {
      // Support comma-separated slugs e.g. "sofas,betten" or single slug
      const slugs = category.split(",").map((s) => s.trim()).filter(Boolean);
      if (slugs.length === 1) {
        // Match the category itself, plus all of its children, always —
        // matching the displayed count (lib/categoryTree.js sums own +
        // every descendant, never either/or). Previously only rolled up
        // when the parent had zero own products, which undercounted the
        // click-through for parents with substantial content in both
        // their own bucket AND their subcategories (Elektroinstallation:
        // 637 own vs. ~12,500 across Schalter/Sicherungen/Smart-Home —
        // the displayed total promised 13,123 but clicking only delivered
        // 637, found 2026-08-22). Subcategories remain a real narrowing
        // tool — clicking one directly still scopes to just that slug.
        params.push(slugs[0]);
        conditions.push(`p.category_id IN (
          SELECT id FROM categories WHERE slug = $${params.length}
          UNION
          SELECT ch.id FROM categories ch
          WHERE ch.parent_id = (SELECT id FROM categories WHERE slug = $${params.length})
        )`);
      } else {
        params.push(slugs);
        conditions.push(`p.category_id IN (
          SELECT id FROM categories WHERE slug = ANY($${params.length})
          UNION
          SELECT ch.id FROM categories ch
          WHERE ch.parent_id IN (SELECT id FROM categories WHERE slug = ANY($${params.length}))
        )`);
      }
    }

    if (excludeCategory) {
      // Used by the homepage's default "Günstigste Angebote heute" view to
      // keep a specific category out of that curated showcase (e.g.
      // Unterwäsche) without hiding it from normal category browsing or
      // search — the category stays fully functional everywhere else.
      // IS DISTINCT FROM (not !=) so products with no category assigned
      // (category_id IS NULL) aren't silently dropped by the exclusion.
      params.push(excludeCategory);
      conditions.push(`p.category_id IS DISTINCT FROM (SELECT id FROM categories WHERE slug = $${params.length})`);
    }

    if (vendor) {
      params.push(`%${vendor}%`);
      conditions.push(`v.name ILIKE $${params.length}`);
    }

    if (premiumOnly) {
      conditions.push(`p.vendor_id IN (SELECT vendor_id FROM premium_vendors WHERE is_active = TRUE)`);
    }

    if (maxPrice < 999999) {
      params.push(maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }

    if (minPrice > 0) {
      params.push(minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const orderBy =
      sort === "priceAsc"  ? "p.price ASC"  :
      sort === "priceDesc" ? "p.price DESC" :
      q ? "ts_rank(p.search_vector, to_tsquery('german', array_to_string(ARRAY(SELECT unaccent(w) || ':*' FROM (SELECT regexp_replace(word, '[^[:alnum:]]', '', 'g') AS w FROM unnest(regexp_split_to_array(trim($1), '\\s+')) AS word) sub WHERE w <> ''), ' & '))) DESC" :
      "p.updated_at DESC";

    let dataResult, total, fallbackTotal = null;

    if (perVendorLimit > 0) {
      // Diversity mode: rank each vendor's own cheapest/best-sorted products
      // first, cap to N per vendor, then take the overall top results among
      // those winners. A plain ORDER BY + LIMIT breaks down when one vendor's
      // catalog is large and densely priced — it can fill the entire raw
      // result set before any per-vendor diversity gets a chance to apply.
      params.push(perVendorLimit);
      const perVendorIdx = params.length;
      params.push(pgLimit);
      const limitIdx = params.length;

      const dataQuery = `
        WITH ranked AS (
          SELECT
            p.id, p.title, p.description, p.image, p.url,
            p.price, p.old_price, p.currency,
            p.category, p.ean,
            v.name AS vendor, v.logo_url AS vendor_logo,
            c.name AS category_name,
            p.in_stock, p.is_active,
            p.active_from, p.active_until, p.updated_at, p.created_at,
            ROW_NUMBER() OVER (PARTITION BY p.vendor_id ORDER BY ${orderBy}) AS vendor_rank
          FROM products p
          LEFT JOIN vendors v ON v.id = p.vendor_id
          LEFT JOIN categories c ON c.id = p.category_id
          ${where}
        )
        SELECT * FROM ranked
        WHERE vendor_rank <= $${perVendorIdx}
        ORDER BY price ${sort === "priceDesc" ? "DESC" : "ASC"}
        LIMIT $${limitIdx}`;

      dataResult = await query(dataQuery, params);
      total = dataResult.rows.length;
    } else {
      const countResult = await query(`SELECT COUNT(*) FROM products p LEFT JOIN vendors v ON v.id = p.vendor_id ${where}`, params);
      total = parseInt(countResult.rows[0].count);

      // A leftover category checkbox silently narrows every search — a user
      // who forgot it's still checked sees "0 results" for a term that
      // genuinely exists elsewhere on the site, with no indication why.
      // NOTE: only reachable on this Postgres path — searches currently
      // always land here since ELASTICSEARCH_URL isn't configured
      // (verified live: /api/products returns source:"postgresql"). If ES
      // is ever enabled, this fallback needs equivalent logic added to
      // lib/elasticsearch.js's searchProducts(), or zero-result ES
      // searches with an active category would silently lose this message.
      // Only runs on the actual zero-result path (rare), so it's not an
      // extra query on every normal search. Built as its own minimal query
      // rather than reusing/slicing `conditions`+`params` — those arrays
      // have positional $N placeholders baked in per condition, so removing
      // just the category entry after the fact would silently break every
      // later parameter's index.
      if (total === 0 && q && category) {
        const fbConditions = ["p.is_active = TRUE", "p.price > 0", "p.image IS NOT NULL AND p.image != ''"];
        if (inStockOnly) fbConditions.push("p.in_stock = TRUE");
        const fbParams = [q];
        fbConditions.push(titleSearchCondition(1));
        fbParams.push(`%${q}%`);
        const fbResult = await query(
          `SELECT COUNT(*) FROM products p WHERE ${fbConditions.join(" AND ")}`,
          fbParams
        );
        fallbackTotal = parseInt(fbResult.rows[0].count);
      }

      params.push(pgLimit, offset);
      dataResult = await query(
        `SELECT
          p.id, p.title, p.description, p.image, p.url,
          p.price, p.old_price, p.currency,
          p.category, p.ean,
          v.name AS vendor, v.logo_url AS vendor_logo,
          c.name AS category_name,
          p.in_stock, p.is_active,
          p.active_from, p.active_until, p.updated_at, p.created_at,
          (SELECT MIN(ph.price) FROM price_history ph
           WHERE ph.product_id = p.id
             AND ph.recorded_at >= CURRENT_DATE - INTERVAL '30 days'
             AND ph.recorded_at < CURRENT_DATE
             AND (SELECT COUNT(*) FROM price_history ph2
                  WHERE ph2.product_id = p.id
                    AND ph2.recorded_at >= CURRENT_DATE - INTERVAL '30 days') >= 7
          ) AS price_30d_min
        FROM products p
        LEFT JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN categories c ON c.id = p.category_id
        ${where}
        ORDER BY ${orderBy}
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
      );
    }

    const result = {
      products: dataResult.rows,
      total,
      page,
      pageCount: Math.ceil(total / pgLimit),
      source: "postgresql",
      ...(fallbackTotal !== null && { fallbackTotal }),
    };

    await cacheSet(cacheKey, result, 300);
    return NextResponse.json(result);

  } catch (err) {
    console.error("Products API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
