import { useTranslations } from "next-intl";
import type { PaymentStatus } from "@/types/booking";
import { 
  getPaymentStatusLabel, 
  getPaymentStatusColorClass 
} from "@/utils/bookingStatus";
import "./StatusBadges.css";

export interface PaymentStatusBadgeProps {
  /** The payment status to display */
  status: PaymentStatus | string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * PaymentStatusBadge Component
 * 
 * A centralized, reusable component for displaying payment status.
 * Uses the utility functions from bookingStatus.ts to ensure consistent
 * display across the entire application.
 * 
 * Features:
 * - Consistent styling via CSS classes
 * - Internationalization support
 * - Dark theme compatible
 * - Type-safe with PaymentStatus type
 * 
 * @example
 * <PaymentStatusBadge status="Paid" />
 * <PaymentStatusBadge status="Unpaid" />
 * <PaymentStatusBadge status="Refunded" />
 */
export function PaymentStatusBadge({ 
  status, 
  className = "" 
}: PaymentStatusBadgeProps) {
  const t = useTranslations();
  
  // Normalize status for CSS class names (convert to lowercase and remove spaces)
  // Note: PaymentStatus uses compound words (PartiallyRefunded, PaymentPending), so we remove spaces
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, "");
  
  // Get the color variant from the utility function
  const colorClass = getPaymentStatusColorClass(status as PaymentStatus);
  
  // Build the full CSS class
  const badgeClass = `im-payment-status im-payment-status--${normalizedStatus} im-status-${colorClass} ${className}`.trim();
  
  // Map status to translation key
  const translationMap: Record<string, string> = {
    paid: t("adminBookings.paymentStatusPaid"),
    unpaid: t("adminBookings.paymentStatusUnpaid"),
    refunded: t("adminBookings.paymentStatusRefunded"),
    partiallyrefunded: t("adminBookings.paymentStatusPartiallyRefunded"),
    paymentpending: t("adminBookings.paymentStatusPaymentPending"),
  };
  
  // Get translated label or use utility function as fallback
  const displayText = translationMap[normalizedStatus] || getPaymentStatusLabel(status as PaymentStatus);
  
  return <span className={badgeClass}>{displayText}</span>;
}
