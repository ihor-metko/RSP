/**
 * GraphSkeleton Component
 * 
 * Reusable loading placeholder for chart/graph components.
 * Displays chart area with x-axis ticks, grid lines, and shimmer effect.
 * 
 * Features:
 * - Responsive width
 * - Grid lines and axis ticks placeholders
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 */

import "./skeletons.css";

export interface GraphSkeletonProps {
  /** Show title and description placeholders */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function GraphSkeleton({
  showHeader = true,
  className = "",
}: GraphSkeletonProps) {
  return (
    <div
      className={`im-graph-skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading chart data...</span>
      
      {/* Header placeholders */}
      {showHeader && (
        <div className="im-graph-skeleton-header">
          <div className="im-skeleton im-graph-skeleton-title" />
          <div className="im-skeleton im-graph-skeleton-description" />
        </div>
      )}
      
      {/* Chart area */}
      <div className="im-graph-skeleton-chart">
        {/* Grid lines */}
        <div className="im-graph-skeleton-grid">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={`grid-line-${index}`} className="im-graph-skeleton-grid-line" />
          ))}
        </div>
        
        {/* Shimmer area */}
        <div className="im-skeleton im-graph-skeleton-area" />
      </div>
      
      {/* X-axis ticks */}
      <div className="im-graph-skeleton-x-axis">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={`x-tick-${index}`} className="im-skeleton im-graph-skeleton-x-tick" />
        ))}
      </div>
    </div>
  );
}

/**
 * Default minimum data points required to render a graph
 */
export const DEFAULT_MIN_POINTS_TO_RENDER = 3;

/**
 * GraphEmptyState Component
 * 
 * Displays when graph has insufficient data points.
 * Shows user-friendly message explaining the empty state.
 * 
 * Features:
 * - Icon + message layout
 * - Configurable message and description
 * - Accessible
 */

interface GraphEmptyStateProps {
  /** Custom message to display */
  message?: string;
  /** Custom description */
  description?: string;
  /** Additional CSS classes */
  className?: string;
}

export function GraphEmptyState({
  message = "Not enough data yet",
  description = "We need more data points to display a meaningful chart. Keep using the platform and check back soon!",
  className = "",
}: GraphEmptyStateProps) {
  return (
    <div className={`im-graph-empty-state ${className}`} role="status">
      {/* Icon */}
      <div className="im-graph-empty-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      </div>
      
      {/* Message */}
      <h3 className="im-graph-empty-title">{message}</h3>
      <p className="im-graph-empty-description">{description}</p>
    </div>
  );
}
