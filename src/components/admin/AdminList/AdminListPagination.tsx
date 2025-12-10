"use client";

import { Card } from "@/components/ui";

interface AdminListPaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  /** Custom text for showing info (e.g., "Showing 1-10 of 50 users") */
  showingText?: string;
  /** Custom text for previous button */
  previousText?: string;
  /** Custom text for next button */
  nextText?: string;
  /** Custom text for page size label */
  pageSizeLabel?: string;
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

/**
 * Reusable pagination component for admin lists
 * 
 * Features:
 * - Page navigation with prev/next buttons
 * - Page number buttons (shows up to 5 pages)
 * - Page size selector
 * - Shows current range (e.g., "Showing 1-10 of 50")
 * - Customizable labels via props
 * 
 * @example
 * ```tsx
 * <AdminListPagination
 *   page={1}
 *   pageSize={10}
 *   totalCount={50}
 *   totalPages={5}
 *   setPage={setPage}
 *   setPageSize={setPageSize}
 *   showingText="Showing 1-10 of 50 users"
 *   previousText="Previous"
 *   nextText="Next"
 *   pageSizeLabel="Per page:"
 * />
 * ```
 */
export function AdminListPagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  setPage,
  setPageSize,
  showingText,
  previousText = "Previous",
  nextText = "Next",
  pageSizeLabel = "Per page:",
}: AdminListPaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const defaultShowingText = `Showing ${start} to ${end} of ${totalCount}`;

  return (
    <Card className="im-pagination-card">
      <div className="im-pagination-info">
        <span className="im-pagination-text">
          {showingText || defaultShowingText}
        </span>
      </div>
      
      <div className="im-pagination-controls">
        <button
          className="im-pagination-btn"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label={previousText}
        >
          <ChevronLeftIcon />
          <span className="im-pagination-btn-text">{previousText}</span>
        </button>
        
        <div className="im-pagination-pages">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = page <= 3
              ? i + 1
              : page + i - 2;
            if (pageNum < 1 || pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                className={`im-pagination-page ${page === pageNum ? "im-pagination-page--active" : ""}`}
                onClick={() => setPage(pageNum)}
                aria-label={`Page ${pageNum}`}
                aria-current={page === pageNum ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        <button
          className="im-pagination-btn"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          aria-label={nextText}
        >
          <span className="im-pagination-btn-text">{nextText}</span>
          <ChevronRightIcon />
        </button>
      </div>
      
      <div className="im-pagination-size">
        <label htmlFor="page-size" className="im-pagination-size-label">
          {pageSizeLabel}
        </label>
        <select
          id="page-size"
          className="im-pagination-size-select"
          value={pageSize}
          onChange={(e) => setPageSize(parseInt(e.target.value))}
        >
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>
    </Card>
  );
}
