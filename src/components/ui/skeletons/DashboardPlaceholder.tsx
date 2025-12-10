/**
 * DashboardPlaceholder Component
 * 
 * Aggregates typical dashboard layout with all skeleton components.
 * Shows entire page in consistent loading state.
 * 
 * Features:
 * - Header skeleton
 * - Grid of metric card skeletons
 * - Graph skeletons
 * - Configurable layout (with/without graphs)
 * - Accessible with proper aria attributes
 */

import MetricCardSkeleton from "./MetricCardSkeleton";
import GraphSkeleton from "./GraphSkeleton";
import "./skeletons.css";

export interface DashboardPlaceholderProps {
  /** Number of metric cards to display */
  metricCount?: number;
  /** Whether to show graph skeletons */
  showGraphs?: boolean;
  /** Number of graph skeletons to display */
  graphCount?: number;
  /** Show page header placeholder */
  showHeader?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function DashboardPlaceholder({
  metricCount = 4,
  showGraphs = true,
  graphCount = 2,
  showHeader = true,
  className = "",
}: DashboardPlaceholderProps) {
  return (
    <div
      className={`im-dashboard-placeholder ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading dashboard...</span>
      
      {/* Header placeholder */}
      {showHeader && (
        <div className="im-dashboard-placeholder-header">
          <div className="im-skeleton im-dashboard-placeholder-title" />
          <div className="im-skeleton im-dashboard-placeholder-description" />
        </div>
      )}
      
      {/* Metrics grid */}
      <div className="im-dashboard-placeholder-metrics">
        {Array.from({ length: metricCount }).map((_, index) => (
          <MetricCardSkeleton
            key={`metric-skeleton-${index}`}
            size="md"
            variant={index % 2 === 0 ? "stat" : "money"}
          />
        ))}
      </div>
      
      {/* Graphs section */}
      {showGraphs && (
        <div className="im-dashboard-placeholder-graphs">
          {Array.from({ length: graphCount }).map((_, index) => (
            <GraphSkeleton
              key={`graph-skeleton-${index}`}
              showHeader={true}
            />
          ))}
        </div>
      )}
    </div>
  );
}
