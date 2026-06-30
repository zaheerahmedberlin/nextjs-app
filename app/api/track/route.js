// POST /api/track
// Records a vendor click and returns the destination URL.
// Rate: €0.005 per click (0.5 cent).
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(request) {
  try {
    const { productId, vendor, url } = await request.json();

    if (!vendor || !url) {
      return NextResponse.json({ error: "vendor and url required" }, { status: 400 });
    }

    // Hash the IP for privacy (GDPR) — never store raw IP
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");
    const userAgent = request.headers.get("user-agent") || "";

    const vendorRow = await query(`SELECT id FROM vendors WHERE name = $1 AND is_active = TRUE`, [vendor]);
    const vendorId  = vendorRow.rows[0]?.id || null;

    await query(
      `INSERT INTO click_events (product_id, vendor_id, product_url, ip_hash, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [productId || null, vendorId, url, ipHash, userAgent]
    );

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Track click error:", err);
    // Still return the URL so the user isn't blocked even if tracking fails
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ url: body.url }, { status: 200 });
  }
}
