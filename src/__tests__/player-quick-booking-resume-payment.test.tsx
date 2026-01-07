/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PlayerQuickBooking } from "@/components/PlayerQuickBooking";
import { determineVisibleSteps } from "@/components/PlayerQuickBooking/types";

// Mock hooks and contexts
jest.mock("@/hooks/useCourtAvailability", () => ({
  useCourtAvailability: jest.fn(),
}));

jest.mock("@/stores/usePlayerClubStore", () => ({
  usePlayerClubStore: jest.fn((selector) => {
    const mockState = {
      clubs: [],
      fetchClubsIfNeeded: jest.fn(),
    };
    return selector ? selector(mockState) : mockState;
  }),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "booking.playerQuickBooking.title": "Quick Booking",
      "wizard.progress": "Booking progress",
      "wizard.steps.dateTime": "Date & Time",
      "wizard.steps.selectCourt": "Select Court",
      "wizard.steps.payment": "Payment",
      "wizard.steps.confirmation": "Confirm Details",
      "wizard.step1Title": "Select date, time and duration",
      "wizard.step2Title": "Choose an available court",
      "wizard.confirmBookingDetails": "Confirm Your Booking Details",
      "wizard.confirmBookingDetailsDescription": "Please confirm your booking details before proceeding to payment.",
      "wizard.step3Title": "Review and confirm payment",
      "wizard.stepLockedInfo": "This step is locked and cannot be modified. You can only complete the payment.",
      "wizard.resumePaymentTitle": "Complete Payment",
      "wizard.resumePaymentInfo": "Complete payment for your reserved booking. Your booking details cannot be changed.",
      "common.cancel": "Cancel",
      "common.date": "Date",
      "common.time": "Time",
      "common.duration": "Duration",
      "common.minutes": "minutes",
      "booking.summary.club": "Club",
      "booking.summary.date": "Date",
      "booking.summary.duration": "Duration",
      "booking.summary.court": "Court",
      "booking.summary.total": "Total",
      "wizard.club": "Club",
      "wizard.court": "Court",
      "wizard.price": "Price",
      "court.type": "Type",
      "court.surface": "Surface",
      "court.location": "Location",
      "court.type.single": "Single",
      "court.type.double": "Double",
      "court.courtType": "Court Format",
      "booking.quickBooking.startTime": "Start Time",
      "wizard.selectPaymentProvider": "Select payment provider",
      "wizard.loadingPaymentProviders": "Loading payment providers...",
      "common.indoor": "Indoor",
    };
    return translations[key] || key;
  },
  useLocale: () => "en",
}));

// Mock useTheme hook
jest.mock("@/hooks/useTheme", () => ({
  useTheme: () => "dark",
}));

// Mock Modal component
jest.mock("@/components/ui", () => ({
  Modal: ({ isOpen, onClose, title, children }: { 
    isOpen: boolean; 
    onClose: () => void; 
    title: string; 
    children: React.ReactNode;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="modal" role="dialog" aria-label={title}>
        <button onClick={onClose} aria-label="Close">×</button>
        <h2>{title}</h2>
        {children}
      </div>
    );
  },
}));

describe("PlayerQuickBooking - Resume Payment Mode", () => {
  const mockResumePaymentBooking = {
    bookingId: "booking-123",
    clubId: "club-456",
    clubName: "Test Club",
    courtId: "court-789",
    courtName: "Court 1",
    courtType: "DOUBLE" as const,
    date: "2026-01-15",
    startTime: "10:00",
    duration: 120,
    price: 5000, // 50.00 in cents
    reservationExpiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
    timezone: "Europe/Kyiv",
  };

  describe("determineVisibleSteps function", () => {
    it("should return all steps (1, 2, 2.5, 3, 4) in resume payment mode", () => {
      const steps = determineVisibleSteps(
        "club-123",
        "court-456",
        { date: "2026-01-15", startTime: "10:00", duration: 120 },
        true // resumePaymentMode
      );

      expect(steps).toHaveLength(5);
      expect(steps.map(s => s.id)).toEqual([1, 2, 2.5, 3, 4]);
      expect(steps.map(s => s.label)).toEqual([
        "dateTime",
        "selectCourt",
        "confirmation",
        "payment",
        "finalConfirmation"
      ]);
    });

    it("should return only confirmation and payment steps in normal mode with all preselected", () => {
      const steps = determineVisibleSteps(
        "club-123",
        "court-456",
        { date: "2026-01-15", startTime: "10:00", duration: 120 },
        false // normal mode
      );

      expect(steps).toHaveLength(3);
      expect(steps.map(s => s.id)).toEqual([2.5, 3, 4]);
    });

    it("should return all steps in normal mode with nothing preselected", () => {
      const steps = determineVisibleSteps(
        undefined,
        undefined,
        undefined,
        false // normal mode
      );

      expect(steps).toHaveLength(6);
      expect(steps.map(s => s.id)).toEqual([0, 1, 2, 2.5, 3, 4]);
    });
  });

  describe("Resume Payment Modal Rendering", () => {
    it("should render the modal in resume payment mode", () => {
      render(
        <PlayerQuickBooking
          isOpen={true}
          onClose={() => {}}
          resumePaymentMode={true}
          resumePaymentBooking={mockResumePaymentBooking}
        />
      );

      // Modal should be visible
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Quick Booking")).toBeInTheDocument();
    });

    it("should show step indicator with all 4 steps", () => {
      render(
        <PlayerQuickBooking
          isOpen={true}
          onClose={() => {}}
          resumePaymentMode={true}
          resumePaymentBooking={mockResumePaymentBooking}
        />
      );

      // Should show step labels
      expect(screen.getByText("Date & Time")).toBeInTheDocument();
      expect(screen.getByText("Select Court")).toBeInTheDocument();
      expect(screen.getByText("Confirm Details")).toBeInTheDocument();
      expect(screen.getByText("Payment")).toBeInTheDocument();
    });

    it("should show locked info message for read-only steps", () => {
      render(
        <PlayerQuickBooking
          isOpen={true}
          onClose={() => {}}
          resumePaymentMode={true}
          resumePaymentBooking={mockResumePaymentBooking}
        />
      );

      // Since we start on step 1 (first visible step in resume mode)
      // it should show the locked info message
      const lockedMessages = screen.getAllByText("This step is locked and cannot be modified. You can only complete the payment.");
      expect(lockedMessages.length).toBeGreaterThan(0);
    });

    it("should display Cancel button instead of Back button", () => {
      render(
        <PlayerQuickBooking
          isOpen={true}
          onClose={() => {}}
          resumePaymentMode={true}
          resumePaymentBooking={mockResumePaymentBooking}
        />
      );

      // Should show Cancel button
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("should initialize with booking data from resumePaymentBooking", () => {
      render(
        <PlayerQuickBooking
          isOpen={true}
          onClose={() => {}}
          resumePaymentMode={true}
          resumePaymentBooking={mockResumePaymentBooking}
        />
      );

      // Should display the club name, court name, etc. in the step content
      // The exact text depends on which step is currently active
      // Since we start on step 1, we should see date/time info
      expect(screen.getByText("Select date, time and duration")).toBeInTheDocument();
    });
  });

  describe("Resume Payment Mode - Step Navigation", () => {
    it("should not allow navigation to previous steps", () => {
      const { container } = render(
        <PlayerQuickBooking
          isOpen={true}
          onClose={() => {}}
          resumePaymentMode={true}
          resumePaymentBooking={mockResumePaymentBooking}
        />
      );

      // In resume payment mode, only Cancel button should be present
      // (not a Back button with arrow icon)
      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeInTheDocument();

      // Check that there's no back arrow icon
      const backArrows = container.querySelectorAll('polyline[points="15,18 9,12 15,6"]');
      expect(backArrows.length).toBe(0);
    });
  });
});
