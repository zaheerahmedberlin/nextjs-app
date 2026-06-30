import { query } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const result = await query("SELECT * FROM admins WHERE email = $1", [email.toLowerCase()]);
    const admin  = result.rows[0];

    if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
      // Same message for both cases — don't leak which field is wrong
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token    = signToken({ id: admin.id, email: admin.email, role: "admin" });
    const response = NextResponse.json({ ok: true });
    setAuthCookie(response, token);
    return response;

  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
