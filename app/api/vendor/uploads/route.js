import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/vendor/uploads — upload history + vendor name for the logged-in vendor
export async function GET() {
  const { vendor, error } = await requireVendor();
  if (error) return error;

  const { rows: vendorRows } = await query(
    "SELECT id, name, email FROM vendors WHERE id = $1",
    [vendor.vendorId]
  );

  const { rows } = await query(
    `SELECT id, original_name, file_size, status,
            total_rows, processed_rows, skipped_rows, error_log,
            created_at, completed_at, approved_at
     FROM vendor_uploads
     WHERE vendor_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [vendor.vendorId]
  );

  return NextResponse.json({ uploads: rows, vendor: vendorRows[0] });
}
