/**
 * StatListSkeleton Component
 * 
 * Reusable loading placeholder for lists of stats/metrics.
 * Renders 3-5 row skeletons with avatar/icon + two lines of text.
 * 
 * Features:
 * - Configurable number of rows (default: 4)
 * - Avatar + two-line content layout
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 */

import "./skeletons.css";

export interface StatListSkeletonProps {
  /** Number of skeleton rows to display */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

export default function StatListSkeleton({
  count = 4,
  className = "",
}: StatListSkeletonProps) {
  return (
    <div
      className={`im-stat-list-skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading statistics...</span>
      
      {Array.from({ length: count }).map((_, index) => (
        <div key={`stat-skeleton-${index}`} className="im-stat-list-skeleton-item">
          {/* Avatar/icon placeholder */}
          <div className="im-skeleton im-stat-list-skeleton-avatar" />
          
          {/* Content lines */}
          <div className="im-stat-list-skeleton-content">
            <div className="im-skeleton im-stat-list-skeleton-line-primary" />
            <div className="im-skeleton im-stat-list-skeleton-line-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}
