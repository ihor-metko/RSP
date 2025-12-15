import { useTranslations } from "next-intl";
import type { BookingStatus } from "@/types/booking";
import { 
  getBookingStatusLabel, 
  getBookingStatusColorClass 
} from "@/utils/bookingStatus";
import "./StatusBadges.css";

export interface BookingStatusBadgeProps {
  /** The booking status to display */
  status: BookingStatus | string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * BookingStatusBadge Component
 * 
 * A centralized, reusable component for displaying booking status.
 * Uses the utility functions from bookingStatus.ts to ensure consistent
 * display across the entire application.
 * 
 * Features:
 * - Consistent styling via CSS classes
 * - Internationalization support
 * - Dark theme compatible
 * - Type-safe with BookingStatus type
 * 
 * @example
 * <BookingStatusBadge status="Active" />
 * <BookingStatusBadge status="Cancelled" />
 * <BookingStatusBadge status="Pending" />
 */
export function BookingStatusBadge({ 
  status, 
  className = "" 
}: BookingStatusBadgeProps) {
  const t = useTranslations();
  
  // Normalize status for CSS class names (convert to lowercase and replace spaces with hyphens)
  // Note: BookingStatus can contain "No-show" which has a hyphen, so we normalize spaces to hyphens
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "-");
  
  // Get the color variant from the utility function
  const colorClass = getBookingStatusColorClass(status as BookingStatus);
  
  // Build the full CSS class
  const badgeClass = `im-booking-status im-booking-status--${normalizedStatus} im-status-${colorClass} ${className}`.trim();
  
  // Map status to translation key
  const translationMap: Record<string, string> = {
    active: t("adminBookings.bookingStatusActive"),
    cancelled: t("adminBookings.bookingStatusCancelled"),
    completed: t("adminBookings.bookingStatusCompleted"),
    "no-show": t("adminBookings.bookingStatusNoShow"),
    pending: t("adminBookings.bookingStatusPending"),
    // Legacy statuses for backward compatibility
    paid: t("adminBookings.statusPaid"),
    reserved: t("adminBookings.statusReserved"),
    ongoing: t("adminBookings.statusOngoing"),
  };
  
  // Get translated label or use utility function as fallback
  const displayText = translationMap[normalizedStatus] || getBookingStatusLabel(status as BookingStatus);
  
  return <span className={badgeClass}>{displayText}</span>;
}
