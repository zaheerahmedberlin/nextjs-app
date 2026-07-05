import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/auth";
import { query } from "@/lib/db";
import { extractHeaders } from "@/lib/vendorFileParser";

export const config = { api: { bodyParser: false } };

// POST /api/vendor/upload
// Phase 1: receive file, extract column headers, return for mapping UI.
// File is NOT stored yet — just parsed for headers.
export async function POST(request) {
  const { vendor, error } = await requireVendor();
  if (error) return error;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    return NextResponse.json({ error: "Keine Datei empfangen" }, { status: 400 });
  }

  const MAX_SIZE = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Datei zu groß (max. 50 MB)" }, { status: 413 });
  }

  const allowed = ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
  if (!allowed.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
    return NextResponse.json({ error: "Nur CSV oder Excel-Dateien erlaubt" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const headers = await extractHeaders(buffer, file.name, file.type);

  // Return existing mapping for this vendor so UI can pre-fill
  const { rows } = await query("SELECT column_mappings FROM vendors WHERE id = $1", [vendor.vendorId]);
  const savedMapping = rows[0]?.column_mappings || null;

  return NextResponse.json({
    headers,
    savedMapping,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  });
}
