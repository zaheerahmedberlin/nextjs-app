// app/api/products/[id]/route.js
import { query } from "@/lib/db";
import { cacheDel } from "@/lib/redis";
import { NextResponse } from "next/server";

// GET /api/products/:id — fetch single product with price history stats
export async function GET(request, { params }) {
  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  try {
    const result = await query(
      `SELECT p.id, p.title, p.description, p.image, p.url,
              p.price, p.old_price, p.currency,
              p.category, p.ean, p.in_stock, p.is_active,
              p.active_from, p.active_until, p.updated_at,
              v.name AS vendor, v.logo_url AS vendor_logo,
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
       WHERE p.id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    return NextResponse.json({ product: result.rows[0] });
  } catch (err) {
    console.error("GET product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const id = parseInt(params.id);
  if (!id) return NextResponse.json({ error: "Invalid product id" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { active_from, active_until } = body;

  // Validate dates
  if (active_from && isNaN(Date.parse(active_from))) {
    return NextResponse.json({ error: "Invalid active_from date" }, { status: 400 });
  }
  if (active_until && isNaN(Date.parse(active_until))) {
    return NextResponse.json({ error: "Invalid active_until date" }, { status: 400 });
  }
  if (active_from && active_until && new Date(active_from) >= new Date(active_until)) {
    return NextResponse.json({ error: "active_from must be before active_until" }, { status: 400 });
  }

  try {
    const result = await query(
      `UPDATE products SET
        active_from  = COALESCE($1::TIMESTAMPTZ, active_from),
        active_until = $2::TIMESTAMPTZ,
        updated_at   = NOW()
      WHERE id = $3
      RETURNING id, title, is_active, active_from, active_until`,
      [active_from ?? null, active_until ?? null, id]
    );

    if (!result.rows.length) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Invalidate Redis cache so next request reflects the change
    await cacheDel(`products:*`);

    return NextResponse.json({
      success: true,
      product: result.rows[0],
    });

  } catch (err) {
    console.error("PATCH product error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
