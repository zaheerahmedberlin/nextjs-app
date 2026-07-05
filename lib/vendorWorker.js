import { query } from "@/lib/db";
import { parseAndMap } from "@/lib/vendorFileParser";

const BATCH = 500;

export async function processUpload(uploadId) {
  await query("UPDATE vendor_uploads SET status = 'processing' WHERE id = $1", [uploadId]);

  const { rows } = await query("SELECT * FROM vendor_uploads WHERE id = $1", [uploadId]);
  const upload = rows[0];
  if (!upload) throw new Error(`Upload ${uploadId} not found`);

  // pg returns bytea as a Buffer, but ensure it's a proper Buffer
  const fileBuffer = Buffer.isBuffer(upload.file_data)
    ? upload.file_data
    : Buffer.from(upload.file_data);

  const productRows = await parseAndMap(
    fileBuffer,
    upload.original_name,
    upload.mime_type,
    upload.column_mapping
  );

  const totalRows = productRows.length;
  await query("UPDATE vendor_uploads SET total_rows = $1 WHERE id = $2", [totalRows, uploadId]);

  // Fetch vendor name once
  const { rows: vRows } = await query("SELECT name FROM vendors WHERE id = $1", [upload.vendor_id]);
  const vendorName = vRows[0]?.name || "";

  let processed = 0;
  let skipped   = 0;
  const errors  = [];

  for (let i = 0; i < productRows.length; i += BATCH) {
    const batch   = productRows.slice(i, i + BATCH);
    const results = await insertBatch(batch, upload.vendor_id, vendorName);
    processed += results.inserted;
    skipped   += results.skipped;
    errors.push(...results.errors);

    await query(
      "UPDATE vendor_uploads SET processed_rows = $1, skipped_rows = $2 WHERE id = $3",
      [processed, skipped, uploadId]
    );
  }

  // Only null file_data on full success — keep bytes on partial/full failure for retry
  const allFailed = processed === 0 && skipped > 0;
  await query(
    `UPDATE vendor_uploads
     SET file_data = $1, status = 'done', completed_at = NOW(), error_log = $2,
         processed_rows = $3, skipped_rows = $4
     WHERE id = $5`,
    [
      allFailed ? upload.file_data : null,
      errors.length ? errors.slice(0, 50).join("\n") : null,
      processed,
      skipped,
      uploadId,
    ]
  );
}

async function insertBatch(rows, vendorId, vendorName) {
  let inserted = 0;
  let skipped  = 0;
  const errors = [];

  for (const row of rows) {
    if (!row.title || !row.price || !row.url) {
      skipped++;
      errors.push(`Übersprungen – Pflichtfelder fehlen: title="${row.title}" price="${row.price}" url="${row.url}"`);
      continue;
    }

    try {
      await query(
        `INSERT INTO products
           (external_id, title, description, image, url, ean,
            price, old_price, in_stock, vendor_id, category)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (vendor_id, external_id)
         DO UPDATE SET
           title       = EXCLUDED.title,
           price       = EXCLUDED.price,
           old_price   = EXCLUDED.old_price,
           image       = EXCLUDED.image,
           description = EXCLUDED.description,
           in_stock    = EXCLUDED.in_stock,
           url         = EXCLUDED.url`,
        [
          row.external_id || null,
          row.title,
          row.description || null,
          row.image || null,
          row.url,
          row.ean || null,
          row.price,
          row.old_price || null,
          row.in_stock ?? true,
          vendorId,
          row.category || null,
        ]
      );
      inserted++;
    } catch (err) {
      skipped++;
      errors.push(`Fehler "${row.title}": ${err.message}`);
    }
  }

  return { inserted, skipped, errors };
}
