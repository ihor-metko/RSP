/**
 * BookingsPreviewSkeleton Component
 * 
 * Loading placeholder for bookings preview section.
 * Displays summary cards and booking list items with shimmer effect.
 * 
 * Features:
 * - Mimics the layout of bookings summary and list
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface BookingsPreviewSkeletonProps {
  /** Number of booking items to display */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

export default function BookingsPreviewSkeleton({
  count = 5,
  className = "",
}: BookingsPreviewSkeletonProps) {
  return (
    <div
      className={`im-section-card ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading bookings...</span>
      
      {/* Section Header */}
      <div className="im-section-header">
        <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
        <div className="im-skeleton h-6 w-48 rounded" />
        <div className="im-section-actions">
          <div className="im-skeleton h-9 w-32 rounded" />
        </div>
      </div>
      
      {/* Bookings Summary */}
      <div className="im-bookings-summary-skeleton">
        {[1, 2, 3].map((index) => (
          <div key={`summary-skeleton-${index}`} className="im-bookings-summary-skeleton-item">
            <div className="im-skeleton h-8 w-16 rounded mb-2" />
            <div className="im-skeleton h-4 w-28 rounded" />
          </div>
        ))}
      </div>
      
      {/* Bookings List */}
      <div className="im-bookings-preview-skeleton-list">
        <div className="im-skeleton h-5 w-40 rounded mb-4" />
        {Array.from({ length: count }).map((_, index) => (
          <div key={`booking-skeleton-${index}`} className="im-booking-preview-skeleton-item">
            <div className="im-booking-preview-skeleton-info">
              <div className="im-skeleton h-5 w-56 rounded mb-2" />
              <div className="im-skeleton h-4 w-40 rounded" />
            </div>
            <div className="im-booking-preview-skeleton-time">
              <div className="im-skeleton h-4 w-24 rounded mb-1" />
              <div className="im-skeleton h-4 w-32 rounded" />
            </div>
            <div className="im-skeleton h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
