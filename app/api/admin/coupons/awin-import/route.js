// GET /api/admin/coupons/awin-import — fetch current AWIN promotions/vouchers
// (read-only, nothing written to the DB here), matched against our own
// vendors by awin_merchant_id so the admin UI can show which offers map to
// a real local vendor vs. one we haven't onboarded.
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

const AWIN_PUBLISHER_ID = "2988023"; // same id used everywhere else for affiliate links

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  if (!process.env.AWIN_API_TOKEN) {
    return NextResponse.json({ error: "AWIN_API_TOKEN not configured" }, { status: 500 });
  }

  try {
    const awinRes = await fetch(`https://api.awin.com/publisher/${AWIN_PUBLISHER_ID}/promotions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AWIN_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: { membership: "joined", status: "active", type: "all" },
        pagination: { page: 1, pageSize: 200 },
      }),
    });

    if (!awinRes.ok) {
      const text = await awinRes.text();
      console.error("AWIN API error:", awinRes.status, text);
      return NextResponse.json({ error: `AWIN API returned ${awinRes.status}` }, { status: 502 });
    }

    const awinData = await awinRes.json();
    const offers = awinData.data || [];

    // Match against our own vendors by awin_merchant_id so the UI can show
    // "no matching vendor" for merchants we're joined to on AWIN but never
    // actually onboarded here.
    const vendorRes = await query(
      `SELECT id, name, awin_merchant_id FROM vendors WHERE awin_merchant_id IS NOT NULL`
    );
    const vendorByMerchantId = new Map(vendorRes.rows.map((v) => [String(v.awin_merchant_id), v]));

    const matched = offers.map((o) => {
      const vendor = vendorByMerchantId.get(String(o.advertiser?.id));
      return {
        promotionId: o.promotionId,
        type: o.type, // "promotion" | "voucher"
        advertiserId: o.advertiser?.id,
        advertiserName: o.advertiser?.name,
        title: o.title,
        description: o.description,
        terms: o.terms,
        startDate: o.startDate,
        endDate: o.endDate,
        trackingUrl: o.urlTracking,
        voucherCode: o.voucher?.code || null,
        localVendorId: vendor?.id || null,
        localVendorName: vendor?.name || null,
      };
    });

    return NextResponse.json({ offers: matched });
  } catch (err) {
    console.error("AWIN import error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
