/**
 * ClubsPreviewSkeleton Component
 * 
 * Loading placeholder for clubs preview section.
 * Displays a list of club preview items with shimmer effect.
 * 
 * Features:
 * - Mimics the layout of club preview list
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface ClubsPreviewSkeletonProps {
  /** Number of club items to display */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

export default function ClubsPreviewSkeleton({
  count = 3,
  className = "",
}: ClubsPreviewSkeletonProps) {
  return (
    <div
      className={`im-section-card ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading clubs...</span>
      
      {/* Section Header */}
      <div className="im-section-header">
        <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
        <div className="im-skeleton h-6 w-32 rounded" />
      </div>
      
      {/* Clubs List */}
      <div className="im-clubs-preview-skeleton-list">
        {Array.from({ length: count }).map((_, index) => (
          <div key={`club-skeleton-${index}`} className="im-club-preview-skeleton-item">
            <div className="im-club-preview-skeleton-info">
              <div className="im-skeleton h-5 w-48 rounded mb-2" />
              <div className="im-skeleton h-4 w-32 rounded" />
            </div>
            <div className="im-skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
