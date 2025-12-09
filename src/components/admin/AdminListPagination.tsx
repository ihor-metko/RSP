import { Card } from "@/components/ui";

interface AdminListPaginationProps {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of items */
  totalCount: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Callback when page size changes */
  onPageSizeChange: (pageSize: number) => void;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Translation texts */
  translations: {
    showing: string;
    to: string;
    of: string;
    previous: string;
    next: string;
    pageSize: string;
  };
}

/**
 * Reusable pagination controls for admin list pages
 * 
 * @example
 * ```tsx
 * <AdminListPagination
 *   page={page}
 *   totalPages={totalPages}
 *   pageSize={pageSize}
 *   totalCount={totalCount}
 *   onPageChange={setPage}
 *   onPageSizeChange={setPageSize}
 *   translations={{
 *     showing: t("users.pagination.showing"),
 *     to: t("users.pagination.to"),
 *     of: t("users.pagination.of"),
 *     previous: t("users.pagination.previous"),
 *     next: t("users.pagination.next"),
 *     pageSize: t("users.pagination.pageSize"),
 *   }}
 * />
 * ```
 */
export function AdminListPagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  translations,
}: AdminListPaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <Card className="im-pagination-card">
      <div className="im-pagination-info">
        <span className="im-pagination-text">
          {translations.showing} {start} {translations.to} {end} {translations.of} {totalCount}
        </span>
      </div>
      <div className="im-pagination-controls">
        <button
          className="im-pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label={translations.previous}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="im-pagination-btn-text">{translations.previous}</span>
        </button>
        <div className="im-pagination-pages">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const pageNum = page <= 3 ? i + 1 : page + i - 2;
            if (pageNum < 1 || pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                className={`im-pagination-page ${page === pageNum ? "im-pagination-page--active" : ""}`}
                onClick={() => onPageChange(pageNum)}
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
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label={translations.next}
        >
          <span className="im-pagination-btn-text">{translations.next}</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
      <div className="im-pagination-size">
        <label htmlFor="page-size" className="im-pagination-size-label">
          {translations.pageSize}
        </label>
        <select
          id="page-size"
          className="im-pagination-size-select"
          value={pageSize}
          onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </Card>
  );
}
