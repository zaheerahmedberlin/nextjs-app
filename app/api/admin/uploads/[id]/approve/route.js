import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { processUpload } from "@/lib/vendorWorker";

// POST /api/admin/uploads/[id]/approve — approve and trigger processing
export async function POST(request, { params }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const { rows } = await query("SELECT * FROM vendor_uploads WHERE id = $1", [id]);
  const upload = rows[0];
  if (!upload) return NextResponse.json({ error: "Upload nicht gefunden" }, { status: 404 });
  if (upload.status !== "pending") {
    return NextResponse.json({ error: "Nur ausstehende Uploads können freigegeben werden" }, { status: 400 });
  }

  await query(
    "UPDATE vendor_uploads SET approved_at = NOW(), approved_by = $1, status = 'processing' WHERE id = $2",
    [admin.email, id]
  );

  // Fire and forget — runs in background while response is returned immediately
  processUpload(parseInt(id)).catch(async (err) => {
    console.error("Upload processing error:", err);
    await query(
      "UPDATE vendor_uploads SET status = 'error', error_log = $1, completed_at = NOW() WHERE id = $2",
      [err.message, id]
    );
  });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/uploads/[id]/approve — reject upload
export async function DELETE(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;
  await query(
    "UPDATE vendor_uploads SET status = 'rejected', completed_at = NOW() WHERE id = $1",
    [id]
  );

  return NextResponse.json({ ok: true });
}
