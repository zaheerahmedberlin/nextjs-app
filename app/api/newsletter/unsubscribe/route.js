// GET /api/newsletter/unsubscribe?token=xxx  — one-click unsubscribe (DSGVO)
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const base  = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!token) {
    return NextResponse.redirect(`${base}/?newsletter=unsubscribe-error`);
  }

  await query(
    `UPDATE newsletter_subscribers
     SET unsubscribed_at = NOW()
     WHERE token = $1 AND unsubscribed_at IS NULL`,
    [token]
  );

  return NextResponse.redirect(`${base}/?newsletter=unsubscribed`);
}
