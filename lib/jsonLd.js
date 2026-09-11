// lib/jsonLd.js
// JSON.stringify does NOT escape "<" or "/", so embedding it directly into
// `<script type="application/ld+json">…</script>` via dangerouslySetInnerHTML
// is exploitable: any string field sourced from vendor/product data (title,
// description, ...) containing the literal text "</script><script>...</script>"
// breaks out of the JSON-LD block and injects a real script tag — the
// browser's HTML parser looks for that byte sequence regardless of JSON
// semantics. Escaping "<" to its unicode form keeps the JSON value identical
// once parsed (by Google, schema readers, etc.) but can no longer be
// recognized as a tag by the HTML parser.
export function safeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, "\\u003c");
}
