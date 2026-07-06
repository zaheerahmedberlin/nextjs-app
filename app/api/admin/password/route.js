import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
  const { error, admin } = await requireAdmin();
  if (error) return error;

  const { currentPassword, newPassword } = await request.json();

  if (!currentPassword || !newPassword)
    return NextResponse.json({ error: "Alle Felder erforderlich" }, { status: 400 });

  if (newPassword.length < 8)
    return NextResponse.json({ error: "Neues Passwort muss mindestens 8 Zeichen haben" }, { status: 400 });

  const result = await query("SELECT password_hash FROM admins WHERE id = $1", [admin.id]);
  const row = result.rows[0];

  if (!row || !(await bcrypt.compare(currentPassword, row.password_hash)))
    return NextResponse.json({ error: "Aktuelles Passwort falsch" }, { status: 401 });

  const hash = await bcrypt.hash(newPassword, 10);
  await query("UPDATE admins SET password_hash = $1 WHERE id = $2", [hash, admin.id]);

  return NextResponse.json({ ok: true });
}
