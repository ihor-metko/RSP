"use client";

import "./Table.css";

export interface TableColumn<T> {
  /** Unique key for the column */
  key: string;
  /** Display header for the column */
  header: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom render function for the cell */
  render?: (row: T) => React.ReactNode;
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
  /** Function to get unique key for each row */
  getRowKey: (row: T) => string;
  /** Currently sorted column key */
  sortBy?: string;
  /** Sort order */
  sortOrder?: "asc" | "desc";
  /** Callback when sort changes */
  onSort?: (columnKey: string) => void;
  /** Whether data is loading */
  loading?: boolean;
  /** Message to show when no data */
  emptyMessage?: string;
  /** Additional CSS classes */
  className?: string;
  /** ARIA label for the table */
  "aria-label"?: string;
}

/**
 * Table Component
 * 
 * A reusable, accessible table component with sorting support.
 * Follows dark theme design system and im-* class conventions.
 * 
 * @example
 * <Table
 *   columns={[
 *     { key: 'name', header: 'Name', sortable: true },
 *     { key: 'email', header: 'Email' },
 *   ]}
 *   data={users}
 *   getRowKey={(row) => row.id}
 *   sortBy="name"
 *   sortOrder="asc"
 *   onSort={handleSort}
 * />
 */
export function Table<T>({
  columns,
  data,
  getRowKey,
  sortBy,
  sortOrder = "asc",
  onSort,
  loading = false,
  emptyMessage = "No data available",
  className = "",
  "aria-label": ariaLabel,
}: TableProps<T>) {
  const handleHeaderClick = (column: TableColumn<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, column: TableColumn<T>) => {
    if ((e.key === "Enter" || e.key === " ") && column.sortable && onSort) {
      e.preventDefault();
      onSort(column.key);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortBy !== columnKey) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <div className={`im-table-wrapper ${className}`.trim()}>
      <table 
        className="im-table" 
        aria-label={ariaLabel}
        role="grid"
      >
        <thead className="im-table-head">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`im-table-header ${column.sortable ? "im-table-header--sortable" : ""} ${sortBy === column.key ? "im-table-header--sorted" : ""} ${column.className || ""}`}
                style={column.width ? { width: column.width } : undefined}
                onClick={() => handleHeaderClick(column)}
                onKeyDown={(e) => handleKeyDown(e, column)}
                tabIndex={column.sortable ? 0 : undefined}
                role="columnheader"
                aria-sort={sortBy === column.key ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
              >
                <span className="im-table-header-content">
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
            <tr className="im-table-loading-row">
              <td colSpan={columns.length} className="im-table-loading-cell">
                <div className="im-table-loading">
                  <div className="im-table-spinner" />
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr className="im-table-empty-row">
              <td colSpan={columns.length} className="im-table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={getRowKey(row)} className="im-table-row">
                {columns.map((column) => (
                  <td 
                    key={column.key} 
                    className={`im-table-cell ${column.className || ""}`}
                    role="gridcell"
                  >
                    {column.render ? column.render(row) : String((row as Record<string, unknown>)[column.key] ?? "")}
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
