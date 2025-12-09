import { Card, Button } from "@/components/ui";
import { ReactNode } from "react";

interface AdminListFiltersProps {
  title: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  children: ReactNode;
  clearFiltersText?: string;
}

/**
 * Reusable filters card for admin list pages
 * 
 * @example
 * ```tsx
 * <AdminListFilters
 *   title={t("users.filters")}
 *   hasActiveFilters={!!filters.searchQuery || !!filters.roleFilter}
 *   onClearFilters={clearFilters}
 *   clearFiltersText={t("users.clearFilters")}
 * >
 *   <Input value={filters.searchQuery} onChange={(e) => setFilter("searchQuery", e.target.value)} />
 *   <Select options={roleOptions} value={filters.roleFilter} onChange={(value) => setFilter("roleFilter", value)} />
 * </AdminListFilters>
 * ```
 */
export function AdminListFilters({
  title,
  hasActiveFilters,
  onClearFilters,
  children,
  clearFiltersText = "Clear Filters",
}: AdminListFiltersProps) {
  return (
    <Card className="im-filters-card">
      <div className="im-filters-header">
        <div className="im-filters-title">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>{title}</span>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="small" onClick={onClearFilters}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
            {clearFiltersText}
          </Button>
        )}
      </div>
      <div className="im-filters-grid">{children}</div>
    </Card>
  );
}
