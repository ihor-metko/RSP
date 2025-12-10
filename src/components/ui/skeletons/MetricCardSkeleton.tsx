/**
 * MetricCardSkeleton Component
 * 
 * Reusable loading placeholder for metric cards.
 * Displays icon placeholder (circle), title bar, large value placeholder, and subtitle.
 * 
 * Features:
 * - Size variants: sm, md, lg
 * - Type variants: stat, money (for future differentiation)
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 */

import "./skeletons.css";

export interface MetricCardSkeletonProps {
  /** Visual variant for the metric card */
  variant?: "stat" | "money";
  /** Size of the skeleton */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
}

export default function MetricCardSkeleton({
  variant = "stat",
  size = "md",
  className = "",
}: MetricCardSkeletonProps) {
  return (
    <article
      className={`im-metric-card-skeleton im-metric-card-skeleton--${size} ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading metric data...</span>
      
      {/* Icon placeholder */}
      <div className={`im-skeleton im-skeleton-icon im-skeleton-icon--${size}`} />
      
      {/* Content area */}
      <div className="im-skeleton-content">
        {/* Value placeholder */}
        <div className={`im-skeleton im-skeleton-value im-skeleton-value--${size}`} />
        
        {/* Title placeholder */}
        <div className={`im-skeleton im-skeleton-title im-skeleton-title--${size}`} />
        
        {/* Optional delta/subtitle for money variant */}
        {variant === "money" && (
          <div className="im-skeleton im-skeleton-delta" />
        )}
      </div>
    </article>
  );
}
