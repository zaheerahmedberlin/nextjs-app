// GET /api/newsletter/confirm/[token]
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const { token } = await params;

  const result = await query(
    `UPDATE newsletter_subscribers
     SET confirmed = TRUE, confirmed_at = NOW()
     WHERE token = $1 AND confirmed = FALSE
     RETURNING email`,
    [token]
  );

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  if (!result.rows[0]) {
    // Token invalid or already confirmed — redirect with status
    return NextResponse.redirect(`${base}/?newsletter=already-confirmed`);
  }

  return NextResponse.redirect(`${base}/?newsletter=confirmed`);
}
