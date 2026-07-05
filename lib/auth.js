import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SECRET  = process.env.JWT_SECRET;
const COOKIE  = "pg_admin_token";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Call at the top of any protected API route handler.
// Returns { admin } on success, or a 401 NextResponse to return immediately.
export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const payload = verifyToken(token);
  if (!payload) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  return { admin: payload };
}

export function setAuthCookie(response, token) {
  response.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   MAX_AGE,
    path:     "/",
  });
}

export function clearAuthCookie(response) {
  response.cookies.set(COOKIE, "", { maxAge: 0, path: "/" });
}

// ── Vendor auth (separate cookie from admin) ──────────────────
const VENDOR_COOKIE = "pg_vendor_token";

export function signVendorToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE });
}

export async function requireVendor() {
  const cookieStore = await cookies();
  const token = cookieStore.get(VENDOR_COOKIE)?.value;
  if (!token) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  const payload = verifyToken(token);
  if (!payload || !payload.vendorId) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };

  return { vendor: payload };
}

export function setVendorCookie(response, token) {
  response.cookies.set(VENDOR_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   MAX_AGE,
    path:     "/",
  });
}

export function clearVendorCookie(response) {
  response.cookies.set(VENDOR_COOKIE, "", { maxAge: 0, path: "/" });
}
