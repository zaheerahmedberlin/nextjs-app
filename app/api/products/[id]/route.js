// app/api/products/[id]/route.js
// PATCH /api/products/:id  — update a product's activation schedule
//
// Body (JSON):
//   { active_from: "2025-01-01T00:00:00Z", active_until: "2025-12-31T23:59:59Z" }
//   active_until: null  → no expiry (product stays active indefinitely)
import { query } from "@/lib/db";
import { cacheDel } from "@/lib/redis";
import { NextResponse } from "next/server";

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
