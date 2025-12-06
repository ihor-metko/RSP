"use client";

import "./Table.css";

export interface TableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Header text */
  header: string;
  /** Whether the column is sortable */
  sortable?: boolean;
  /** Custom render function for cell content */
  render?: (row: T, index: number) => React.ReactNode;
  /** CSS class for the column */
  className?: string;
  /** Width of the column */
  width?: string;
}

export interface TableProps<T> {
  /** Array of column definitions */
  columns: TableColumn<T>[];
  /** Array of data rows */
  data: T[];
  /** Key extractor function for rows */
  keyExtractor: (row: T) => string;
  /** Currently sorted column key */
  sortBy?: string;
  /** Current sort order */
  sortOrder?: "asc" | "desc";
  /** Callback when sort is changed */
  onSort?: (key: string) => void;
  /** Whether the table is loading */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for the table */
  ariaLabel?: string;
}

/**
 * Table Component
 *
 * A reusable, accessible table component with sorting support.
 * Follows the platform's dark theme and im-* class conventions.
 *
 * @example
 * const columns = [
 *   { key: 'name', header: 'Name', sortable: true },
 *   { key: 'email', header: 'Email' },
 *   { key: 'status', header: 'Status', render: (row) => <Badge>{row.status}</Badge> }
 * ];
 *
 * <Table
 *   columns={columns}
 *   data={users}
 *   keyExtractor={(user) => user.id}
 *   sortBy="name"
 *   sortOrder="asc"
 *   onSort={(key) => handleSort(key)}
 * />
 */
export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyExtractor,
  sortBy,
  sortOrder = "asc",
  onSort,
  loading = false,
  emptyMessage = "No data available",
  className = "",
  ariaLabel,
}: TableProps<T>) {
  const getSortIcon = (key: string) => {
    if (sortBy !== key) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if ((e.key === "Enter" || e.key === " ") && onSort) {
      e.preventDefault();
      onSort(key);
    }
  };

  return (
    <div className={`im-table-wrapper ${className}`.trim()}>
      <table className="im-table" aria-label={ariaLabel}>
        <thead className="im-table-head">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`im-table-th ${column.sortable ? "im-table-th--sortable" : ""} ${sortBy === column.key ? "im-table-th--sorted" : ""} ${column.className || ""}`.trim()}
                style={column.width ? { width: column.width } : undefined}
                onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
                onKeyDown={column.sortable ? (e) => handleKeyDown(e, column.key) : undefined}
                tabIndex={column.sortable ? 0 : undefined}
                role={column.sortable ? "button" : undefined}
                aria-sort={
                  column.sortable && sortBy === column.key
                    ? sortOrder === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <span className="im-table-th-content">
                  {column.header}
                  {column.sortable && (
                    <span className="im-table-sort-icon" aria-hidden="true">
                      {getSortIcon(column.key)}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="im-table-body">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="im-table-loading">
                <div className="im-table-loading-spinner" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="im-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr key={keyExtractor(row)} className="im-table-row">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`im-table-td ${column.className || ""}`.trim()}
                  >
                    {column.render
                      ? column.render(row, rowIndex)
                      : String(row[column.key] ?? "-")}
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
