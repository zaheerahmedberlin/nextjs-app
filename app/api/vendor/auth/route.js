import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signVendorToken, setVendorCookie, clearVendorCookie } from "@/lib/auth";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

// Same rationale as app/api/auth/login/route.js's DUMMY_HASH — keeps
// bcrypt.compare() timing consistent whether or not the vendor exists.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8G8Y4kA9qEePWXsZ8dc3AxvOvBAQxK";

export async function POST(request) {
  const ip = getClientIp(request);
  if (await isRateLimited(`login-attempts:vendor:${ip}`)) {
    return NextResponse.json({ error: "Zu viele Versuche, bitte später erneut versuchen" }, { status: 429 });
  }

  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }

  const { rows } = await query(
    "SELECT id, name, email, password_hash FROM vendors WHERE email = $1 AND is_active = TRUE",
    [email.toLowerCase().trim()]
  );

  const vendor = rows[0];
  const valid = await bcrypt.compare(password, vendor?.password_hash || DUMMY_HASH);

  if (!vendor || !vendor.password_hash || !valid) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const token = signVendorToken({ vendorId: vendor.id, name: vendor.name, email: vendor.email });
  const response = NextResponse.json({ ok: true, name: vendor.name });
  setVendorCookie(response, token);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearVendorCookie(response);
  return response;
}
