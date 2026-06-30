import { requireAdmin } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  return NextResponse.json({ email: admin.email, role: admin.role });
}
