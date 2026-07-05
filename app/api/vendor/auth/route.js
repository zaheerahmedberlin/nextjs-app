import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signVendorToken, setVendorCookie, clearVendorCookie } from "@/lib/auth";

export async function POST(request) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }

  const { rows } = await query(
    "SELECT id, name, email, password_hash FROM vendors WHERE email = $1 AND is_active = TRUE",
    [email.toLowerCase().trim()]
  );

  const vendor = rows[0];
  if (!vendor || !vendor.password_hash) {
    return NextResponse.json({ error: "Ungültige Anmeldedaten" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, vendor.password_hash);
  if (!valid) {
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
