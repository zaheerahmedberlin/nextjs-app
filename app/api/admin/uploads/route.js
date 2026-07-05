import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/admin/uploads — all uploads across all vendors for admin review
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const { rows } = await query(
    `SELECT vu.id, vu.original_name, vu.file_size, vu.status,
            vu.total_rows, vu.processed_rows, vu.skipped_rows,
            vu.error_log, vu.created_at, vu.completed_at, vu.approved_at,
            v.name AS vendor_name, v.email AS vendor_email
     FROM vendor_uploads vu
     JOIN vendors v ON v.id = vu.vendor_id
     ORDER BY vu.created_at DESC
     LIMIT 100`
  );

  return NextResponse.json({ uploads: rows });
}
