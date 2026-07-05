import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth";
import { query } from "@/lib/db";
import { processUpload } from "@/lib/vendorWorker";

// POST /api/vendor/upload/confirm
// Phase 2: vendor confirmed the column mapping.
// Store file bytes + mapping in DB, kick off background worker.
export async function POST(request) {
  const { vendor, error } = await requireVendor();
  if (error) return error;

  const formData = await request.formData();
  const file     = formData.get("file");
  const mapping  = formData.get("mapping"); // JSON string

  if (!file || !mapping) {
    return NextResponse.json({ error: "Datei und Spaltenzuordnung erforderlich" }, { status: 400 });
  }

  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Datei zu groß (max. 50 MB)" }, { status: 413 });
  }

  let columnMapping;
  try {
    columnMapping = JSON.parse(mapping);
  } catch {
    return NextResponse.json({ error: "Ungültige Spaltenzuordnung" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Save mapping back to vendor for future uploads
  await query(
    "UPDATE vendors SET column_mappings = $1 WHERE id = $2",
    [JSON.stringify(columnMapping), vendor.vendorId]
  );

  // Insert upload record with raw bytes
  const { rows } = await query(
    `INSERT INTO vendor_uploads
       (vendor_id, original_name, file_size, mime_type, file_data, column_mapping, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING id`,
    [vendor.vendorId, file.name, file.size, file.type, buffer, JSON.stringify(columnMapping)]
  );

  const uploadId = rows[0].id;

  // Fire and forget — admin must approve before actual processing starts
  // (processUpload is called from /api/admin/uploads/[id]/approve)

  return NextResponse.json({
    ok: true,
    uploadId,
    message: "Datei empfangen, wir verarbeiten sie im Hintergrund.",
  });
}
