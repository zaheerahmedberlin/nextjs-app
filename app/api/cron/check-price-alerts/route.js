import { query } from "@/lib/db";
import { sendPriceAlertTriggered } from "@/lib/email";
import { NextResponse } from "next/server";

// GET /api/cron/check-price-alerts
// Called nightly by cron-job.org after price snapshot runs
export async function GET(request) {
  const token = request.headers.get("x-cron-token");
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all active alerts where current price <= target price
    const alerts = await query(`
      SELECT
        pa.id, pa.email, pa.target_price,
        p.id AS product_id, p.title, p.price AS current_price,
        p.image, p.url, v.name AS vendor
      FROM price_alerts pa
      JOIN products p ON p.id = pa.product_id
      LEFT JOIN vendors v ON v.id = p.vendor_id
      WHERE pa.is_active = TRUE
        AND p.is_active = TRUE
        AND p.price <= pa.target_price
    `);

    let triggered = 0;
    for (const alert of alerts.rows) {
      try {
        await sendPriceAlertTriggered({
          to: alert.email,
          product: {
            title: alert.title,
            image: alert.image,
            url: alert.url,
            vendor: alert.vendor,
          },
          targetPrice: parseFloat(alert.target_price),
          currentPrice: parseFloat(alert.current_price),
        });

        // Deactivate alert after triggering so user doesn't get spammed
        await query(
          `UPDATE price_alerts SET is_active = FALSE, triggered_at = NOW() WHERE id = $1`,
          [alert.id]
        );
        triggered++;
      } catch (e) {
        console.error(`Failed to send alert ${alert.id}:`, e);
      }
    }

    return NextResponse.json({ ok: true, checked: alerts.rows.length, triggered });
  } catch (err) {
    console.error("check-price-alerts error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
