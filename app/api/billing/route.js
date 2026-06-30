// GET /api/billing?vendor=Home24&from=2025-01-01&to=2025-12-31
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const vendorFilter = searchParams.get("vendor") ?? "";
  const from         = searchParams.get("from")   ?? "";
  const to           = searchParams.get("to")     ?? "";

  // Build click_events filter (applied via subquery)
  const ceParams = [];
  const ceConds  = [];
  if (from) { ceParams.push(from); ceConds.push(`clicked_at >= $${ceParams.length}::DATE`); }
  if (to)   { ceParams.push(to);   ceConds.push(`clicked_at < ($${ceParams.length}::DATE + INTERVAL '1 day')`); }
  const ceWhere = ceConds.length ? `WHERE ${ceConds.join(" AND ")}` : "";

  // Vendor filter
  const vParams = [...ceParams];
  const vCond   = vendorFilter ? (vParams.push(vendorFilter), `WHERE v.name = $${vParams.length}`) : "";

  try {
    const summary = await query(`
      SELECT
        v.id,
        v.name            AS vendor,
        v.billing_rate,
        v.is_active,
        v.member_since,
        v.contact_email,
        COUNT(ce.id)                  AS clicks,
        COUNT(ce.id) * v.billing_rate AS cost_eur
      FROM vendors v
      LEFT JOIN (SELECT * FROM click_events ${ceWhere}) ce ON ce.vendor_id = v.id
      ${vCond}
      GROUP BY v.id
      ORDER BY clicks DESC
    `, vParams);

    const dailyParams = [...ceParams];
    const dailyConds  = [...ceConds];
    if (vendorFilter) { dailyParams.push(vendorFilter); dailyConds.push(`v.name = $${dailyParams.length}`); }
    const dailyWhere  = dailyConds.length ? `WHERE ${dailyConds.join(" AND ")}` : "";

    const daily = await query(`
      SELECT
        v.name                        AS vendor,
        DATE(ce.clicked_at)           AS day,
        COUNT(ce.id)                  AS clicks,
        COUNT(ce.id) * v.billing_rate AS cost_eur
      FROM click_events ce
      JOIN vendors v ON v.id = ce.vendor_id
      ${dailyWhere}
      GROUP BY v.name, v.billing_rate, DATE(ce.clicked_at)
      ORDER BY day DESC, clicks DESC
    `, dailyParams);

    const totalClicks = summary.rows.reduce((s, r) => s + parseInt(r.clicks), 0);
    const totalCost   = summary.rows.reduce((s, r) => s + parseFloat(r.cost_eur || 0), 0);

    return NextResponse.json({
      total_clicks:   totalClicks,
      total_cost_eur: parseFloat(totalCost.toFixed(4)),
      vendors: summary.rows.map((r) => ({
        id:            r.id,
        vendor:        r.vendor,
        billing_rate:  parseFloat(r.billing_rate),
        is_active:     r.is_active,
        member_since:  r.member_since,
        contact_email: r.contact_email,
        clicks:        parseInt(r.clicks),
        cost_eur:      parseFloat(parseFloat(r.cost_eur || 0).toFixed(4)),
      })),
      daily: daily.rows.map((r) => ({
        vendor:   r.vendor,
        day:      r.day,
        clicks:   parseInt(r.clicks),
        cost_eur: parseFloat(parseFloat(r.cost_eur || 0).toFixed(4)),
      })),
    });
  } catch (err) {
    console.error("Billing API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
