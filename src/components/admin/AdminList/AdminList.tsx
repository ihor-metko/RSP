"use client";

import { ReactNode, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { PageHeader, Card } from "@/components/ui";
import { useListController, UseListControllerOptions, UseListControllerReturn } from "@/hooks";
import { AdminListPagination } from "./AdminListPagination";
import "./AdminList.css";

/**
 * Props for AdminList component
 */
export interface AdminListProps<TFilters = Record<string, unknown>, TItem = unknown> {
  /** Page title */
  title: string;
  /** Page subtitle/description */
  subtitle?: string;
  /** Actions to display in page header (e.g., Create button) */
  headerActions?: ReactNode;
  /** List controller options */
  listOptions: UseListControllerOptions<TFilters>;
  /** Render function for filters */
  renderFilters: (controller: UseListControllerReturn<TFilters>) => ReactNode;
  /** Render function for list content (table, cards, etc.) */
  renderList: (controller: UseListControllerReturn<TFilters>, items: TItem[], loading: boolean) => ReactNode;
  /** Custom pagination renderer (optional, uses default if not provided) */
  renderPagination?: (controller: UseListControllerReturn<TFilters>, totalCount: number, totalPages: number) => ReactNode;
  /** Fetch function that receives current filters, sorting, and pagination */
  fetchData: (params: {
    filters: TFilters;
    sortBy: string;
    sortOrder: "asc" | "desc";
    page: number;
    pageSize: number;
  }) => Promise<void>;
  /** Items to display */
  items: TItem[];
  /** Loading state */
  loading: boolean;
  /** Error message */
  error?: string;
  /** Total count of items */
  totalCount?: number;
  /** Total pages */
  totalPages?: number;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state icon (optional) */
  emptyIcon?: ReactNode;
  /** Breadcrumbs (optional) */
  breadcrumbs?: ReactNode;
  /** Show pagination (default: true) */
  showPagination?: boolean;
}

/**
 * Generic AdminList component
 * 
 * This component provides a reusable structure for admin list pages with:
 * - Integrated useListController for persistent state management
 * - Automatic data fetching when filters/sorting/pagination changes
 * - Common UI shell (header, filters, content, pagination)
 * - Flexible rendering via render props for entity-specific UI
 * 
 * Features:
 * - Persists filters, sorting, and pagination to localStorage
 * - Debounced state updates to prevent excessive writes
 * - Type-safe filter management
 * - Graceful error handling
 * - Loading and empty states
 * - Reusable pagination component
 * 
 * @example
 * ```tsx
 * <AdminList
 *   title={t("users.title")}
 *   subtitle={t("users.subtitle")}
 *   listOptions={{
 *     entityKey: "users",
 *     defaultFilters: { search: "", role: "" },
 *   }}
 *   renderFilters={(controller) => <UserFilters {...controller} />}
 *   renderList={(controller, items) => <UserTable items={items} />}
 *   fetchData={fetchUsers}
 *   items={users}
 *   loading={loading}
 *   totalCount={totalCount}
 *   totalPages={totalPages}
 * />
 * ```
 */
export function AdminList<TFilters = Record<string, unknown>, TItem = unknown>({
  title,
  subtitle,
  headerActions,
  listOptions,
  renderFilters,
  renderList,
  renderPagination,
  fetchData,
  items,
  loading,
  error,
  totalCount = 0,
  totalPages = 0,
  emptyMessage,
  emptyDescription,
  emptyIcon,
  breadcrumbs,
  showPagination = true,
}: AdminListProps<TFilters, TItem>) {
  const t = useTranslations();
  
  // Initialize list controller with provided options
  const controller = useListController<TFilters>(listOptions);

  // Fetch data when controller state changes
  const handleFetchData = useCallback(async () => {
    await fetchData({
      filters: controller.filters,
      sortBy: controller.sortBy,
      sortOrder: controller.sortOrder,
      page: controller.page,
      pageSize: controller.pageSize,
    });
  }, [fetchData, controller.filters, controller.sortBy, controller.sortOrder, controller.page, controller.pageSize]);

  useEffect(() => {
    if (controller.isLoaded) {
      handleFetchData();
    }
  }, [controller.isLoaded, handleFetchData]);

  // Show loading state on initial load
  if (loading && items.length === 0 && !error) {
    return (
      <main className="im-admin-list-page">
        <div className="im-admin-list-loading">
          <div className="im-admin-list-loading-spinner" />
          <span className="im-admin-list-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="im-admin-list-page">
      <PageHeader
        title={title}
        description={subtitle}
        actions={headerActions}
      />

      <section className="rsp-content">
        {breadcrumbs}

        {/* Filters Section */}
        {renderFilters(controller)}

        {/* Error Display */}
        {error && (
          <div className="im-error-alert" role="alert">
            <span className="im-error-icon">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Empty State */}
        {items.length === 0 && !loading ? (
          <Card className="im-empty-state">
            <div className="im-empty-state-content">
              {emptyIcon && <div className="im-empty-state-icon">{emptyIcon}</div>}
              {emptyMessage && <h3 className="im-empty-state-title">{emptyMessage}</h3>}
              {emptyDescription && <p className="im-empty-state-description">{emptyDescription}</p>}
            </div>
          </Card>
        ) : (
          <>
            {/* List Content */}
            {renderList(controller, items, loading)}

            {/* Pagination */}
            {showPagination && totalPages > 1 && (
              renderPagination ? (
                renderPagination(controller, totalCount, totalPages)
              ) : (
                <AdminListPagination
                  page={controller.page}
                  pageSize={controller.pageSize}
                  totalCount={totalCount}
                  totalPages={totalPages}
                  setPage={controller.setPage}
                  setPageSize={controller.setPageSize}
                />
              )
            )}
          </>
        )}
      </section>
    </main>
  );
}
