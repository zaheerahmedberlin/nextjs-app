// components/Pagination.jsx
"use client";

// Returns page numbers with '...' gap markers, e.g. [1, '...', 4, 5, 6, '...', 76] —
// always keeps first/last page plus a small window around the current page so
// jumping to page 5 or 76 doesn't require clicking "Weiter" dozens of times.
function getPageNumbers(current, total, delta = 1) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      pages.push(i);
    }
  }
  const withGaps = [];
  let prev;
  for (const p of pages) {
    if (prev != null) {
      if (p - prev === 2) withGaps.push(prev + 1);
      else if (p - prev > 2) withGaps.push("…");
    }
    withGaps.push(p);
    prev = p;
  }
  return withGaps;
}

export default function Pagination({ currentPage, pageCount, setCurrentPage }) {
  if (pageCount <= 1) return null;
  // Vue: v-if="pageCount > 1" — in React we return null to render nothing

  const pages = getPageNumbers(currentPage, pageCount);

  return (
    <div className="d-flex flex-column align-items-center gap-2 mt-4">
      <div className="d-flex flex-wrap justify-content-center align-items-center gap-2">
        <button
          className="btn btn-outline-secondary"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          ← Zurück
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 text-muted">…</span>
          ) : (
            <button
              key={p}
              className={`btn ${p === currentPage ? "btn-brand" : "btn-outline-secondary"}`}
              style={{ minWidth: 42 }}
              aria-current={p === currentPage ? "page" : undefined}
              onClick={() => setCurrentPage(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className="btn btn-outline-secondary"
          disabled={currentPage === pageCount}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Weiter →
        </button>
      </div>

      <span className="small text-muted">
        Seite {currentPage} von {pageCount}
      </span>
    </div>
  );
}
