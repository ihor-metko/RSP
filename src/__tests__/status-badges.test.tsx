/**
 * Tests for BookingStatusBadge and PaymentStatusBadge components
 * These tests verify that the status badge components render correctly
 * and apply the proper styling for different status values.
 */

import { render, screen } from "@testing-library/react";
import { BookingStatusBadge, PaymentStatusBadge } from "@/components/ui";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    // Mock translation map
    const translations: Record<string, string> = {
      "adminBookings.bookingStatusUpcoming": "Upcoming",
      "adminBookings.bookingStatusCancelled": "Cancelled",
      "adminBookings.bookingStatusCompleted": "Completed",
      "adminBookings.bookingStatusNoShow": "No-show",
      "adminBookings.bookingStatusConfirmed": "Confirmed",
      "adminBookings.bookingStatusActive": "Upcoming", // backward compat
      "adminBookings.bookingStatusPending": "Confirmed", // backward compat
      "adminBookings.statusPaid": "Paid",
      "adminBookings.statusReserved": "Reserved",
      "adminBookings.statusOngoing": "Ongoing",
      "adminBookings.paymentStatusPaid": "Paid",
      "adminBookings.paymentStatusUnpaid": "Unpaid",
      "adminBookings.paymentStatusRefunded": "Refunded",
      "adminBookings.paymentStatusPartiallyRefunded": "Partially Refunded",
      "adminBookings.paymentStatusPaymentPending": "Payment Pending",
    };
    return translations[key] || key;
  },
}));

describe("BookingStatusBadge", () => {
  it("should render UPCOMING status with correct styling", () => {
    render(<BookingStatusBadge status="UPCOMING" />);
    const badge = screen.getByText("Upcoming");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--upcoming");
  });

  it("should render Confirmed status with correct styling", () => {
    render(<BookingStatusBadge status="Confirmed" />);
    const badge = screen.getByText("Confirmed");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--confirmed");
  });

  it("should render Cancelled status with correct styling", () => {
    render(<BookingStatusBadge status="Cancelled" />);
    const badge = screen.getByText("Cancelled");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--cancelled");
  });

  it("should render Completed status with correct styling", () => {
    render(<BookingStatusBadge status="Completed" />);
    const badge = screen.getByText("Completed");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--completed");
  });

  it("should render No-show status with correct styling", () => {
    render(<BookingStatusBadge status="No-show" />);
    const badge = screen.getByText("No-show");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--no-show");
  });

  it("should handle legacy Active status (maps to Upcoming)", () => {
    render(<BookingStatusBadge status="Active" />);
    const badge = screen.getByText("Upcoming");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--active");
  });

  it("should handle legacy Pending status (maps to Confirmed)", () => {
    render(<BookingStatusBadge status="Pending" />);
    const badge = screen.getByText("Confirmed");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--pending");
  });

  it("should handle legacy status values", () => {
    render(<BookingStatusBadge status="paid" />);
    const badge = screen.getByText("Paid");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-booking-status");
    expect(badge).toHaveClass("im-booking-status--paid");
  });

  it("should apply custom className when provided", () => {
    render(<BookingStatusBadge status="UPCOMING" className="custom-class" />);
    const badge = screen.getByText("Upcoming");
    expect(badge).toHaveClass("custom-class");
  });

  it("should apply color class from utility function", () => {
    render(<BookingStatusBadge status="UPCOMING" />);
    const badge = screen.getByText("Upcoming");
    expect(badge).toHaveClass("im-status-success");
  });

  it("should normalize status with spaces for CSS class", () => {
    render(<BookingStatusBadge status="No-show" />);
    const badge = screen.getByText("No-show");
    expect(badge).toHaveClass("im-booking-status--no-show");
  });
});

describe("PaymentStatusBadge", () => {
  it("should render Paid status with correct styling", () => {
    render(<PaymentStatusBadge status="Paid" />);
    const badge = screen.getByText("Paid");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-payment-status");
    expect(badge).toHaveClass("im-payment-status--paid");
  });

  it("should render Unpaid status with correct styling", () => {
    render(<PaymentStatusBadge status="Unpaid" />);
    const badge = screen.getByText("Unpaid");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-payment-status");
    expect(badge).toHaveClass("im-payment-status--unpaid");
  });

  it("should render Refunded status with correct styling", () => {
    render(<PaymentStatusBadge status="Refunded" />);
    const badge = screen.getByText("Refunded");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("im-payment-status");
    expect(badge).toHaveClass("im-payment-status--refunded");
  });

  it("should apply custom className when provided", () => {
    render(<PaymentStatusBadge status="Paid" className="custom-class" />);
    const badge = screen.getByText("Paid");
    expect(badge).toHaveClass("custom-class");
  });

  it("should apply color class from utility function", () => {
    render(<PaymentStatusBadge status="Paid" />);
    const badge = screen.getByText("Paid");
    expect(badge).toHaveClass("im-status-success");
  });
});

describe("Status Badge Components - Integration", () => {
  it("should render both booking and payment status badges together", () => {
    render(
      <div>
        <BookingStatusBadge status="UPCOMING" />
        <PaymentStatusBadge status="Paid" />
      </div>
    );
    
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("should maintain consistent styling between booking and payment badges", () => {
    render(
      <div>
        <BookingStatusBadge status="UPCOMING" />
        <PaymentStatusBadge status="Paid" />
      </div>
    );
    
    const bookingBadge = screen.getByText("Upcoming");
    const paymentBadge = screen.getByText("Paid");
    
    // Both should have color classes
    expect(bookingBadge).toHaveClass("im-status-success");
    expect(paymentBadge).toHaveClass("im-status-success");
    
    // Both should have their respective type classes
    expect(bookingBadge).toHaveClass("im-booking-status");
    expect(paymentBadge).toHaveClass("im-payment-status");
  });
});
