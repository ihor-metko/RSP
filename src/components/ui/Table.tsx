"use client";

import { ReactNode } from "react";
import "./Table.css";

interface TableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Column header text */
  header: ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Width of the column (e.g., "200px", "20%") */
  width?: string;
  /** Cell renderer function */
  render?: (item: T, index: number) => ReactNode;
  /** Alignment for the column */
  align?: "left" | "center" | "right";
  /** Additional CSS class for the column */
  className?: string;
}

interface TableProps<T> {
  /** Data to display in the table */
  data: T[];
  /** Column definitions */
  columns: TableColumn<T>[];
  /** Unique key extractor for each row */
  keyExtractor: (item: T) => string;
  /** Currently sorted column key */
  sortKey?: string;
  /** Current sort direction */
  sortOrder?: "asc" | "desc";
  /** Callback when a sortable column header is clicked */
  onSort?: (key: string) => void;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Whether rows should have hover effect */
  hoverable?: boolean;
  /** Whether to show zebra striping */
  striped?: boolean;
  /** Additional CSS class for the table container */
  className?: string;
  /** Row click handler */
  onRowClick?: (item: T) => void;
  /** Caption for accessibility */
  caption?: string;
}

/**
 * Table Component
 *
 * A reusable, accessible table component with sorting, loading states,
 * and customizable columns.
 *
 * @example
 * <Table
 *   data={users}
 *   columns={[
 *     { key: "name", header: "Name", sortable: true },
 *     { key: "email", header: "Email" },
 *     { key: "role", header: "Role", render: (user) => <Badge>{user.role}</Badge> },
 *   ]}
 *   keyExtractor={(user) => user.id}
 *   sortKey="name"
 *   sortOrder="asc"
 *   onSort={(key) => handleSort(key)}
 * />
 */
export function Table<T>({
  data,
  columns,
  keyExtractor,
  sortKey,
  sortOrder,
  onSort,
  loading = false,
  emptyMessage = "No data available",
  hoverable = true,
  striped = false,
  className = "",
  onRowClick,
  caption,
}: TableProps<T>) {
  const handleHeaderClick = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, column: TableColumn<T>) => {
    if ((e.key === "Enter" || e.key === " ") && column.sortable) {
      e.preventDefault();
      handleHeaderClick(column);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortKey !== columnKey) {
      return (
        <span className="im-table-sort-icon im-table-sort-icon--neutral" aria-hidden="true">
          ↕
        </span>
      );
    }
    return (
      <span className="im-table-sort-icon im-table-sort-icon--active" aria-hidden="true">
        {sortOrder === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const getCellValue = (item: T, column: TableColumn<T>, index: number): ReactNode => {
    if (column.render) {
      return column.render(item, index);
    }
    const value = (item as Record<string, unknown>)[column.key];
    return value !== null && value !== undefined ? String(value) : "-";
  };

  return (
    <div className={`im-table-wrapper ${className}`.trim()}>
      <table className={`im-table ${striped ? "im-table--striped" : ""} ${hoverable ? "im-table--hoverable" : ""}`}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="im-table-head">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`im-table-header ${column.sortable ? "im-table-header--sortable" : ""} ${sortKey === column.key ? "im-table-header--sorted" : ""} ${column.align ? `im-table-cell--${column.align}` : ""} ${column.className || ""}`}
                style={column.width ? { width: column.width } : undefined}
                onClick={() => handleHeaderClick(column)}
                onKeyDown={(e) => handleKeyDown(e, column)}
                tabIndex={column.sortable ? 0 : undefined}
                role={column.sortable ? "button" : undefined}
                aria-sort={
                  sortKey === column.key
                    ? sortOrder === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <span className="im-table-header-content">
                  {column.header}
                  {column.sortable && getSortIcon(column.key)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="im-table-body">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="im-table-loading">
                <div className="im-table-loading-content">
                  <div className="im-table-loading-spinner" />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="im-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={`im-table-row ${onRowClick ? "im-table-row--clickable" : ""}`}
                onClick={() => onRowClick?.(item)}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && onRowClick) {
                    e.preventDefault();
                    onRowClick(item);
                  }
                }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`im-table-cell ${column.align ? `im-table-cell--${column.align}` : ""} ${column.className || ""}`}
                  >
                    {getCellValue(item, column, index)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export type { TableColumn, TableProps };
