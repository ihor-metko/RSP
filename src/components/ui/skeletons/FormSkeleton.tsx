/**
 * FormSkeleton Component
 * 
 * Reusable loading placeholder for forms.
 * Displays form fields with shimmer effect.
 * 
 * Features:
 * - Configurable number of fields
 * - Different field types (text, select, textarea)
 * - Shimmer animation
 * - Accessible with aria-busy and sr-only text
 * - Dark theme support
 */

import "./skeletons.css";

export interface FormSkeletonProps {
  /** Number of form fields to display */
  fields?: number;
  /** Show submit button */
  showButton?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export default function FormSkeleton({
  fields = 5,
  showButton = true,
  className = "",
}: FormSkeletonProps) {
  return (
    <div
      className={`im-form-skeleton ${className}`}
      role="status"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading form...</span>
      
      <div className="im-form-skeleton-container">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={`field-${index}`} className="im-form-skeleton-field">
            {/* Label */}
            <div className="im-skeleton im-form-skeleton-label" />
            
            {/* Input */}
            <div className="im-skeleton im-form-skeleton-input" />
          </div>
        ))}
        
        {/* Submit button */}
        {showButton && (
          <div className="im-form-skeleton-actions">
            <div className="im-skeleton im-form-skeleton-button" />
          </div>
        )}
      </div>
    </div>
  );
}
