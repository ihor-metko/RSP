"use client";

import { Card, Button } from "@/components/ui";
import type { UseListControllerReturn } from "@/hooks/useListController";
import { useControllerOrContext } from "./ListControllerContext";
import "./PaginationControls.css";

interface PaginationControlsProps<TFilters = Record<string, unknown>> {
  /** List controller - if not provided, uses context */
  controller?: UseListControllerReturn<TFilters>;
  /** Total number of items */
  totalCount?: number;
  /** Total number of pages */
  totalPages?: number;
  /** Show/hide page size selector */
  showPageSize?: boolean;
  /** Available page size options */
  pageSizeOptions?: number[];
  /** Additional CSS classes */
  className?: string;
  /** Translation function (optional) */
  t?: (key: string, params?: Record<string, unknown>) => string;
}

// Default icons
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
 * Pagination controls component with page navigation and size selector.
 * 
 * Features:
 * - Previous/Next navigation
 * - Page number display
 * - Page size selector
 * - Shows current range and total count
 * - Keyboard accessible
 * 
 * @example
 * ```tsx
 * <PaginationControls 
 *   controller={controller}
 *   totalCount={150}
 *   totalPages={6}
 *   showPageSize={true}
 * />
 * ```
 */
export function PaginationControls<TFilters = Record<string, unknown>>({
  controller: controllerProp,
  totalCount = 0,
  totalPages = 1,
  showPageSize = true,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
  t = (key: string, params?: Record<string, unknown>) => {
    // Default English translations
    const translations: Record<string, string> = {
      "pagination.showing": `Showing ${params?.start} to ${params?.end} of ${params?.total}`,
      "pagination.previous": "Previous",
      "pagination.next": "Next",
      "pagination.pageSize": "Items per page",
      "pagination.page": "Page",
    };
    return translations[key] || key;
  },
}: PaginationControlsProps<TFilters>) {
  // Use helper hook that handles both prop and context
  const controller = useControllerOrContext(controllerProp);

  const { page, pageSize, setPage, setPageSize } = controller;

  // Calculate display values
  const startItem = totalCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, totalCount);

  // Don't render if there's nothing to paginate
  if (totalCount === 0) {
    return null;
  }

  return (
    <Card className={`im-pagination-card ${className}`.trim()}>
      <div className="im-pagination-info">
        <span className="im-pagination-text">
          {t("pagination.showing", {
            start: startItem,
            end: endItem,
            total: totalCount,
          })}
        </span>
      </div>

      <div className="im-pagination-controls">
        <Button
          variant="outline"
          size="small"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label={t("pagination.previous")}
          className="im-pagination-btn"
        >
          <ChevronLeftIcon />
          <span className="im-pagination-btn-text">{t("pagination.previous")}</span>
        </Button>

        <div className="im-pagination-pages">
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            // Show 5 pages centered around current page
            const pageNum = page <= 3 ? i + 1 : page + i - 2;
            
            if (pageNum < 1 || pageNum > totalPages) return null;
            
            return (
              <button
                key={pageNum}
                className={`im-pagination-page ${page === pageNum ? "im-pagination-page--active" : ""}`}
                onClick={() => setPage(pageNum)}
                aria-label={`${t("pagination.page")} ${pageNum}`}
                aria-current={page === pageNum ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="small"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
          aria-label={t("pagination.next")}
          className="im-pagination-btn"
        >
          <span className="im-pagination-btn-text">{t("pagination.next")}</span>
          <ChevronRightIcon />
        </Button>
      </div>

      {showPageSize && (
        <div className="im-pagination-size">
          <label htmlFor="page-size" className="im-pagination-size-label">
            {t("pagination.pageSize")}
          </label>
          <select
            id="page-size"
            className="im-pagination-size-select"
            value={pageSize}
            onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      )}
    </Card>
  );
}
