/**
 * OrgInfoCardSkeleton Component
 * 
 * Loading placeholder for organization info card.
 * Displays a grid of label-value pairs with shimmer effect.
 * 
 * Features:
 * - Mimics the layout of organization info grid
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface OrgInfoCardSkeletonProps {
  /** Number of info items to display */
  items?: number;
  /** Additional CSS classes */
  className?: string;
}

export default function OrgInfoCardSkeleton({
  items = 6,
  className = "",
}: OrgInfoCardSkeletonProps) {
  return (
    <div
      className={`im-section-card ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading organization information...</span>
      
      {/* Section Header */}
      <div className="im-section-header">
        <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
        <div className="im-skeleton h-6 w-48 rounded" />
      </div>
      
      {/* Info Grid */}
      <div className="im-org-info-skeleton-grid">
        {Array.from({ length: items }).map((_, index) => (
          <div key={`info-skeleton-${index}`} className="im-org-info-skeleton-item">
            <div className="im-skeleton h-4 w-24 rounded mb-2" />
            <div className="im-skeleton h-5 w-32 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
