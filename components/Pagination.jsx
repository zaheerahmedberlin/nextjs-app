// components/Pagination.jsx
"use client";

export default function Pagination({ currentPage, pageCount, setCurrentPage }) {
  if (pageCount <= 1) return null;
  // Vue: v-if="pageCount > 1" — in React we return null to render nothing

  return (
    <div className="d-flex justify-content-center align-items-center gap-3 mt-4">
      <button
        className="btn btn-outline-secondary"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage((p) => p - 1)}
      >
        ← Zurück
      </button>

      <span className="fw-semibold">
        Seite {currentPage} von {pageCount}
      </span>

      <button
        className="btn btn-outline-secondary"
        disabled={currentPage === pageCount}
        onClick={() => setCurrentPage((p) => p + 1)}
      >
        Weiter →
      </button>
    </div>
  );
}
