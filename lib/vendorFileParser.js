import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";
import sanitizeHtml from "sanitize-html";
import chardet from "chardet";

// Our canonical product fields vendors can map to
export const OUR_FIELDS = [
  { key: "title",       label: "Titel",       required: true  },
  { key: "price",       label: "Preis",       required: true  },
  { key: "url",         label: "Produkt-URL", required: true  },
  { key: "image",       label: "Bild-URL",    required: false },
  { key: "description", label: "Beschreibung",required: false },
  { key: "old_price",   label: "Alter Preis", required: false },
  { key: "ean",         label: "EAN",         required: false },
  { key: "in_stock",    label: "Auf Lager",   required: false },
  { key: "category",    label: "Kategorie",   required: false },
  { key: "external_id", label: "Artikel-Nr.", required: false },
];

// Extract only the header row from a file buffer
export async function extractHeaders(buffer, fileName, mimeType) {
  const rows = await parseFile(buffer, fileName, mimeType, { headersOnly: true });
  return rows;
}

// Parse full file and return rows mapped to our schema using columnMapping
export async function parseAndMap(buffer, fileName, mimeType, columnMapping) {
  const rows = await parseFile(buffer, fileName, mimeType, { headersOnly: false });
  return rows.map(row => mapRow(row, columnMapping));
}

// ── Internal ──────────────────────────────────────────────────

async function parseFile(buffer, fileName, mimeType, { headersOnly }) {
  const isExcel = /\.(xlsx|xls)$/i.test(fileName) ||
    mimeType?.includes("spreadsheetml") || mimeType?.includes("ms-excel");

  if (isExcel) {
    return parseExcel(buffer, headersOnly);
  }
  return parseCsv(buffer, headersOnly);
}

function parseExcel(buffer, headersOnly) {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (!data.length) return [];
  const headers = data[0].map(String);
  if (headersOnly) return headers;

  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
    return obj;
  });
}

function parseCsv(buffer, headersOnly) {
  // Auto-detect encoding (Windows-1252 is common in German vendor exports)
  const detected = chardet.detect(buffer) || "utf-8";
  const encoding = detected.toLowerCase().includes("windows") ? "latin1" : "utf-8";
  const text = buffer.toString(encoding);

  const rows = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  if (headersOnly) return rows.length ? Object.keys(rows[0]) : [];
  return rows;
}

function mapRow(row, columnMapping) {
  const mapped = {};
  for (const [vendorCol, ourField] of Object.entries(columnMapping)) {
    if (!ourField || ourField === "__ignore__") continue;
    mapped[ourField] = row[vendorCol] ?? "";
  }

  // Clean description
  if (mapped.description) {
    mapped.description = sanitizeHtml(mapped.description, { allowedTags: [], allowedAttributes: {} }).trim();
    if (mapped.description.length > 5000) mapped.description = mapped.description.slice(0, 5000);
  }

  // Normalize price fields
  for (const field of ["price", "old_price"]) {
    if (mapped[field]) {
      mapped[field] = parseFloat(String(mapped[field]).replace(/[^\d.,]/g, "").replace(",", ".")) || null;
    }
  }

  // Normalize in_stock
  if (mapped.in_stock !== undefined) {
    const v = String(mapped.in_stock).toLowerCase().trim();
    mapped.in_stock = ["1", "true", "ja", "yes", "verfügbar"].includes(v);
  }

  return mapped;
}
