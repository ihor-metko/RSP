/**
 * TableSkeleton Component
 * 
 * Reusable loading placeholder for data tables.
 * Displays table header and rows with shimmer effect.
 * 
 * Features:
 * - Configurable number of rows and columns
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface TableSkeletonProps {
  /** Number of rows to display */
  rows?: number;
  /** Number of columns to display */
  columns?: number;
  /** Show header row */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  className = "",
}: TableSkeletonProps) {
  return (
    <div
      className={`im-table-skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading table data...</span>
      
      <div className="im-table-skeleton-container">
        <table className="im-table-skeleton-table">
          {/* Header */}
          {showHeader && (
            <thead className="im-table-skeleton-header">
              <tr>
                {Array.from({ length: columns }).map((_, index) => (
                  <th key={`header-${index}`} className="im-table-skeleton-header-cell">
                    <div className="im-skeleton im-table-skeleton-header-content" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          
          {/* Body */}
          <tbody className="im-table-skeleton-body">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={`row-${rowIndex}`} className="im-table-skeleton-row">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={`cell-${rowIndex}-${colIndex}`} className="im-table-skeleton-cell">
                    <div className="im-skeleton im-table-skeleton-cell-content" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
