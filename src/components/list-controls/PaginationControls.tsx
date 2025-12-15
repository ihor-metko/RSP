"use client";

import { useTranslations } from "next-intl";
import { Card, Button, Select } from "@/components/ui";
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
 * Calculate which page numbers to display in pagination.
 * Shows up to 5 pages centered around the current page.
 *
 * Examples:
 * - page=1, total=10: [1, 2, 3, 4, 5]
 * - page=3, total=10: [1, 2, 3, 4, 5]
 * - page=5, total=10: [3, 4, 5, 6, 7]
 * - page=10, total=10: [6, 7, 8, 9, 10]
 */
function calculateVisiblePages(currentPage: number, totalPages: number): number[] {
  const maxVisible = 5;

  // If total pages <= maxVisible, show all pages
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // Calculate start page to center current page
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));

  // Adjust if we're near the end
  if (startPage + maxVisible - 1 > totalPages) {
    startPage = totalPages - maxVisible + 1;
  }

  return Array.from({ length: maxVisible }, (_, i) => startPage + i);
}

/**
 * Pagination controls component with page navigation and size selector.
 *
 * A reusable, fully-featured pagination component that provides intuitive
 * navigation through large datasets with visual feedback and accessibility support.
 *
 * Features:
 * - Previous/Next navigation with disabled states
 * - Page number buttons (shows up to 5 pages centered on current)
 * - Active page clearly highlighted
 * - Page size selector for flexible display options
 * - Shows current item range and total count
 * - Fully keyboard accessible with proper ARIA labels
 * - Responsive layout (stacks on mobile)
 * - Consistent im-* styling for dark theme support
 * - Smooth hover and focus transitions
 * - Integrates seamlessly with useListController
 *
 * Usage:
 * Place at the bottom of list pages to enable navigation through paginated data.
 * Works with any list page using the useListController hook.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PaginationControls
 *   controller={controller}
 *   totalCount={150}
 *   totalPages={6}
 *   showPageSize={true}
 * />
 *
 * // With context from provider
 * <ListControllerProvider controller={controller}>
 *   <PaginationControls totalCount={data.length} totalPages={totalPages} />
 * </ListControllerProvider>
 *
 * // Custom page size options
 * <PaginationControls
 *   controller={controller}
 *   totalCount={500}
 *   totalPages={10}
 *   pageSizeOptions={[25, 50, 100, 200]}
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
}: PaginationControlsProps<TFilters>) {
  // Get translations from next-intl using the pagination namespace
  const t = useTranslations("pagination");
  
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
    <Card className={`im-pagination-card ${className}`.trim()} cardBodyClassName="flex w-full justify-between">
      <div className="im-pagination-info">
        <span className="im-pagination-text">
          {t("showing", {
            start: startItem.toString(),
            end: endItem.toString(),
            total: totalCount.toString(),
          })}
        </span>
      </div>

      <div className="im-pagination-controls">
        <Button
          variant="outline"
          size="small"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          aria-label={t("previous")}
          className="im-pagination-btn"
        >
          <ChevronLeftIcon />
          <span className="im-pagination-btn-text">{t("previous")}</span>
        </Button>

        <div className="im-pagination-pages">
          {calculateVisiblePages(page, totalPages).map((pageNum) => {
            return (
              <button
                key={pageNum}
                className={`im-pagination-page ${page === pageNum ? "im-pagination-page--active" : ""}`}
                onClick={() => setPage(pageNum)}
                aria-label={`${t("page")} ${pageNum}`}
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
          aria-label={t("next")}
          className="im-pagination-btn"
        >
          <span className="im-pagination-btn-text">{t("next")}</span>
          <ChevronRightIcon />
        </Button>
      </div>

      {showPageSize && (
        <div className="im-pagination-size">
          <Select
            label={t("pageSize")}
            options={pageSizeOptions.map((size) => ({
              value: size.toString(),
              label: size.toString(),
            }))}
            value={pageSize.toString()}
            onChange={(value) => setPageSize(parseInt(value, 10))}
            className="im-pagination-size-select"
          />
        </div>
      )}
    </Card>
  );
}
