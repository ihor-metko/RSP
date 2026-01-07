/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QuickBookingWizard } from "@/components/QuickBookingWizard";
import { DEFAULT_DURATION } from "@/components/QuickBookingWizard/types";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "booking.quickBooking.title": "Quick Booking",
      "wizard.progress": "Booking progress",
      "wizard.steps.dateTime": "Date & Time",
      "wizard.steps.selectCourt": "Select Court",
      "wizard.steps.payment": "Payment",
      "wizard.step1Title": "Select date, time and duration",
      "common.date": "Date",
      "common.duration": "Duration",
      "common.minutes": "minutes",
      "common.cancel": "Cancel",
      "booking.quickBooking.startTime": "Start Time",
      "wizard.estimatedPrice": "Estimated Price",
      "wizard.priceVariesByTime": "Final price may vary",
    };
    return translations[key] || key;
  },
}));

// Mock Modal component
jest.mock("@/components/ui", () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
    if (!isOpen) return null;
    return <div data-testid="modal">{children}</div>;
  },
  Select: ({ id, label, options, value, onChange }: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  ),
}));

// Mock fetch
global.fetch = jest.fn();

describe("Quick Booking Default Duration", () => {
  const defaultProps = {
    clubId: "test-club-id",
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with default duration of 120 minutes (2 hours)", async () => {
    render(<QuickBookingWizard {...defaultProps} />);

    await waitFor(() => {
      const durationSelect = screen.getByLabelText("Duration");
      expect(durationSelect).toBeInTheDocument();
    });

    const durationSelect = screen.getByLabelText("Duration") as HTMLSelectElement;
    expect(durationSelect.value).toBe(String(DEFAULT_DURATION));
    expect(durationSelect.value).toBe("120");
  });

  it("should have 120 minutes as the default duration constant", () => {
    expect(DEFAULT_DURATION).toBe(120);
  });

  it("should include all expected duration options including 150 and 180 minutes", async () => {
    render(<QuickBookingWizard {...defaultProps} />);

    await waitFor(() => {
      const durationSelect = screen.getByLabelText("Duration");
      expect(durationSelect).toBeInTheDocument();
    });

    const durationSelect = screen.getByLabelText("Duration") as HTMLSelectElement;
    const options = Array.from(durationSelect.options).map(opt => opt.value);
    
    // Should include all duration options: 30, 60, 90, 120, 150, 180
    expect(options).toContain("30");
    expect(options).toContain("60");
    expect(options).toContain("90");
    expect(options).toContain("120");
    expect(options).toContain("150");
    expect(options).toContain("180");
  });
});
