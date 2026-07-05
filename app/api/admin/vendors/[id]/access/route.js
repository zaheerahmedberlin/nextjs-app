import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

// POST /api/admin/vendors/[id]/access
// Set or update a vendor's portal login email + password
export async function POST(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "E-Mail und Passwort erforderlich" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });
  }

  // Check email not taken by another vendor
  const { rows: existing } = await query(
    "SELECT id FROM vendors WHERE email = $1 AND id != $2",
    [email.toLowerCase().trim(), id]
  );
  if (existing.length) {
    return NextResponse.json({ error: "E-Mail bereits vergeben" }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 10);
  await query(
    "UPDATE vendors SET email = $1, password_hash = $2 WHERE id = $3",
    [email.toLowerCase().trim(), hash, id]
  );

  return NextResponse.json({ ok: true });
}
