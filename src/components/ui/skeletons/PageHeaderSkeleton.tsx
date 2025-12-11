/**
 * PageHeaderSkeleton Component
 * 
 * Reusable loading placeholder for page headers.
 * Displays title and description placeholders with shimmer effect.
 * 
 * Features:
 * - Title and description placeholders
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface PageHeaderSkeletonProps {
  /** Show description placeholder */
  showDescription?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function PageHeaderSkeleton({
  showDescription = true,
  className = "",
}: PageHeaderSkeletonProps) {
  return (
    <div
      className={`im-page-header-skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading page header...</span>
      
      {/* Title */}
      <div className="im-skeleton im-page-header-skeleton-title" />
      
      {/* Description */}
      {showDescription && (
        <div className="im-skeleton im-page-header-skeleton-description" />
      )}
    </div>
  );
}
