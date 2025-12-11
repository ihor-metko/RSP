/**
 * CardListSkeleton Component
 * 
 * Reusable loading placeholder for card grids/lists.
 * Displays a grid of card placeholders with shimmer effect.
 * 
 * Features:
 * - Configurable number of cards
 * - Responsive grid layout
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface CardListSkeletonProps {
  /** Number of cards to display */
  count?: number;
  /** Card layout variant */
  variant?: "default" | "compact" | "detailed";
  /** Additional CSS classes */
  className?: string;
}

export default function CardListSkeleton({
  count = 6,
  variant = "default",
  className = "",
}: CardListSkeletonProps) {
  return (
    <div
      className={`im-card-list-skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading cards...</span>
      
      <div className="im-card-list-skeleton-grid">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={`card-skeleton-${index}`}
            className={`im-card-skeleton im-card-skeleton--${variant}`}
          >
            {/* Image placeholder */}
            {variant !== "compact" && (
              <div className="im-skeleton im-card-skeleton-image" />
            )}
            
            {/* Content area */}
            <div className="im-card-skeleton-content">
              {/* Title */}
              <div className="im-skeleton im-card-skeleton-title" />
              
              {/* Description lines */}
              <div className="im-card-skeleton-description">
                <div className="im-skeleton im-card-skeleton-line im-card-skeleton-line--long" />
                <div className="im-skeleton im-card-skeleton-line im-card-skeleton-line--medium" />
                {variant === "detailed" && (
                  <div className="im-skeleton im-card-skeleton-line im-card-skeleton-line--short" />
                )}
              </div>
              
              {/* Meta info (tags, badges, etc) */}
              {variant !== "compact" && (
                <div className="im-card-skeleton-meta">
                  <div className="im-skeleton im-card-skeleton-badge" />
                  <div className="im-skeleton im-card-skeleton-badge" />
                </div>
              )}
              
              {/* Action button */}
              <div className="im-skeleton im-card-skeleton-button" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
