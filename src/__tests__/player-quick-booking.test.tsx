/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PlayerQuickBooking } from "@/components/PlayerQuickBooking";

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
      "wizard.steps.selectClub": "Select Club",
      "wizard.steps.payment": "Payment",
      "wizard.steps.confirmation": "Confirmation",
      "wizard.step0Title": "Select a club",
      "wizard.step1Title": "Select date, time and duration",
      "wizard.step2Title": "Choose an available court",
      "wizard.step3Title": "Review and confirm payment",
      "wizard.selectClubDescription": "Choose a club where you'd like to play",
      "common.date": "Date",
      "common.duration": "Duration",
      "common.minutes": "minutes",
      "common.hour": "hour",
      "common.hours": "hours",
      "common.cancel": "Cancel",
      "common.back": "Back",
      "common.processing": "Processing...",
      "common.indoor": "Indoor",
      "booking.quickBooking.startTime": "Start Time",
      "wizard.estimatedPrice": "Estimated Price",
      "wizard.priceVariesByTime": "Final price may vary",
      "wizard.priceRangeHint": "Price range based on available courts",
      "wizard.courtTypeHint": "Double — for a pair, Single — for one player",
      "wizard.continue": "Continue",
      "wizard.confirmBooking": "Confirm Booking",
      "wizard.loadingClubs": "Loading clubs...",
      "wizard.loadingCourts": "Finding available courts...",
      "wizard.selectCourt": "Select a court",
      "wizard.availableCount": "{count} available",
      "booking.quickBooking.noCourtsAvailable": "No courts available",
      "wizard.club": "Club",
      "wizard.court": "Court",
      "wizard.total": "Total",
      "wizard.payWithCard": "Card",
      "wizard.applePay": "Apple Pay",
      "wizard.googlePay": "Google Pay",
      "wizard.bookingConfirmed": "Booking Confirmed!",
      "wizard.bookingConfirmedMessage": "Your court has been reserved successfully.",
      "auth.errorOccurred": "An error occurred",
      "courts.courtType": "Court Type",
      "courts.padelCourtFormatSingle": "Single",
      "courts.padelCourtFormatDouble": "Double",
    };
    return translations[key] || key;
  },
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
  Select: ({ id, label, options, value, onChange, disabled }: {
    id: string;
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select 
        id={id} 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  ),
  RadioGroup: ({ label, name, options, value, onChange, disabled }: {
    label?: string;
    name: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div data-testid={`radio-group-${name}`}>
      {label && <span>{label}</span>}
      <div role="radiogroup">
        {options.map((opt) => (
          <label key={opt.value}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  ),
  DateInput: ({ label, value, onChange, disabled }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      <label>{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("PlayerQuickBooking", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders the booking wizard when open", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ clubs: [] }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} />);
    });
    
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Quick Booking")).toBeInTheDocument();
  });

  it("does not render when closed", async () => {
    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} isOpen={false} />);
    });
    
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("shows club selection when no club is preselected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        clubs: [
          {
            id: "club-1",
            name: "Club Alpha",
            slug: null,
            location: "City Center",
            city: "Metropolis",
          }
        ] 
      }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText("Select a club")).toBeInTheDocument();
    });
  });

  it("skips club selection when club is preselected", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        id: "club-1",
        name: "Club Alpha",
      }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText("Select date, time and duration")).toBeInTheDocument();
    });
  });

  it("shows datetime selection on step 1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        id: "club-1",
        name: "Club Alpha",
      }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });
    
    await waitFor(() => {
      expect(screen.getByLabelText("Date")).toBeInTheDocument();
      expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
      expect(screen.getByLabelText("Duration")).toBeInTheDocument();
    });
  });

  it("navigates to court selection when continue is clicked", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          id: "club-1",
          name: "Club Alpha",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          availableCourts: [
            {
              id: "court-1",
              name: "Court 1",
              slug: null,
              type: "Padel",
              surface: "Artificial grass",
              indoor: true,
              defaultPriceCents: 5000,
            }
          ] 
        }),
      });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText("Continue")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Continue"));
    });

    await waitFor(() => {
      expect(screen.getByText("Choose an available court")).toBeInTheDocument();
    });
  });

  it("shows step indicators for visible steps only", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        id: "club-1",
        name: "Club Alpha",
      }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });
    
    await waitFor(() => {
      expect(screen.getByText("Date & Time")).toBeInTheDocument();
      expect(screen.getByText("Select Court")).toBeInTheDocument();
      expect(screen.getByText("Payment")).toBeInTheDocument();
    });

    // Club selection should not be visible since it's preselected
    expect(screen.queryByText("Select Club")).not.toBeInTheDocument();
  });
});

describe("PlayerQuickBooking - Preselection", () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("skips to payment when all data is preselected", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          id: "club-1",
          name: "Club Alpha",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          id: "court-1",
          name: "Court 1",
        }),
      });

    const preselectedDateTime = {
      date: "2024-12-25",
      startTime: "10:00",
      duration: 60,
    };

    await act(async () => {
      render(
        <PlayerQuickBooking 
          {...defaultProps} 
          preselectedClubId="club-1"
          preselectedCourtId="court-1"
          preselectedDateTime={preselectedDateTime}
        />
      );
    });
    
    await waitFor(() => {
      expect(screen.getByText("Review and confirm payment")).toBeInTheDocument();
    });
  });

  it("displays court type selection with Double selected by default", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ clubs: [] }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });
    
    await waitFor(() => {
      const radioGroup = screen.getByTestId("radio-group-court-type");
      expect(radioGroup).toBeInTheDocument();
    });

    const doubleRadio = screen.getByLabelText("Double") as HTMLInputElement;
    const singleRadio = screen.getByLabelText("Single") as HTMLInputElement;

    expect(doubleRadio).toBeChecked();
    expect(singleRadio).not.toBeChecked();
  });

  it("allows changing court type selection", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ clubs: [] }),
    });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });
    
    await waitFor(() => {
      expect(screen.getByTestId("radio-group-court-type")).toBeInTheDocument();
    });

    const singleRadio = screen.getByLabelText("Single") as HTMLInputElement;
    const doubleRadio = screen.getByLabelText("Double") as HTMLInputElement;

    // Initially Double should be selected
    expect(doubleRadio).toBeChecked();
    expect(singleRadio).not.toBeChecked();

    // Click Single
    await act(async () => {
      fireEvent.click(singleRadio);
    });

    // Now Single should be selected
    expect(singleRadio).toBeChecked();
    expect(doubleRadio).not.toBeChecked();
  });

  it("includes court type in API request when fetching available courts", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ clubs: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          availableCourts: [
            {
              id: "court-1",
              name: "Court 1",
              type: "Double",
              surface: "Grass",
              indoor: false,
              defaultPriceCents: 5000,
            }
          ] 
        }),
      });

    await act(async () => {
      render(<PlayerQuickBooking {...defaultProps} preselectedClubId="club-1" />);
    });

    // Move to step 2
    await waitFor(() => {
      expect(screen.getByText("wizard.continue")).toBeInTheDocument();
    });

    const continueButton = screen.getByText("wizard.continue");
    await act(async () => {
      fireEvent.click(continueButton);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("courtType=DOUBLE")
      );
    });
  });
});
