import { query } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isRateLimited, getClientIp } from "@/lib/rateLimit";

// Any bcrypt hash works here — it's never meant to match, only to make
// bcrypt.compare() run real work for the "no such admin" case too. Without
// this, that branch short-circuited on `!admin` and returned near-instantly
// while a wrong-password attempt took bcrypt's full compare time, letting an
// attacker enumerate valid admin emails purely from response timing.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8G8Y4kA9qEePWXsZ8dc3AxvOvBAQxK";

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (await isRateLimited(`login-attempts:admin:${ip}`)) {
      return NextResponse.json({ error: "Too many attempts, please try again later" }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const result = await query("SELECT * FROM admins WHERE email = $1", [email.toLowerCase()]);
    const admin  = result.rows[0];

    const passwordMatches = await bcrypt.compare(password, admin?.password_hash || DUMMY_HASH);

    if (!admin || !passwordMatches) {
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
