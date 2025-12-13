/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AdminQuickBookingWizard } from "@/components/AdminQuickBookingWizard";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "adminWizard.title": "Create Booking",
      "wizard.progress": "Booking progress",
      "adminWizard.steps.organization": "Organization",
      "adminWizard.steps.club": "Club",
      "adminWizard.steps.user": "User",
      "adminWizard.steps.dateTime": "Date & Time",
      "adminWizard.steps.selectCourt": "Court",
      "adminWizard.steps.confirmation": "Confirm",
      "adminWizard.selectOrganization": "Select Organization",
      "adminWizard.selectOrganizationDescription": "Choose the organization for this booking",
      "adminBookings.organization": "Organization",
      "adminWizard.selectClub": "Select Club",
      "adminWizard.selectClubDescription": "Choose the club where the booking will be made",
      "adminBookings.club": "Club",
      "adminWizard.selectUser": "Select User",
      "adminWizard.selectUserDescription": "Choose the user for this booking or create a new user",
      "adminWizard.existingUser": "Existing User",
      "adminWizard.selectDateTime": "Select Date and Time",
      "adminWizard.selectDateTimeDescription": "Choose when the booking will take place",
      "wizard.step2Title": "Choose an available court",
      "adminWizard.confirmBooking": "Confirm Booking",
      "adminWizard.confirmBookingDescription": "Review the booking details and confirm",
      "common.date": "Date",
      "common.duration": "Duration",
      "common.minutes": "minutes",
      "common.cancel": "Cancel",
      "common.back": "Back",
      "common.loading": "Loading...",
      "common.processing": "Processing...",
      "booking.quickBooking.startTime": "Start Time",
      "wizard.continue": "Continue",
      "wizard.confirmBooking": "Confirm Booking",
      "wizard.loadingCourts": "Finding available courts...",
      "wizard.selectCourt": "Select a court",
      "wizard.availableCount": "{count} available",
      "common.indoor": "Indoor",
      "booking.quickBooking.noCourtsAvailable": "No courts available",
      "auth.errorOccurred": "An error occurred",
      "adminWizard.noOrganizationsAvailable": "No organizations available",
      "adminWizard.noClubsAvailable": "No clubs available",
      "adminWizard.noUsersAvailable": "No users available",
    };
    return translations[key] || key;
  },
}));

// Mock UI components
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
  Button: ({ children, onClick, disabled }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Input: ({ id, label, value, onChange, disabled, type }: {
    id: string;
    label: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    disabled?: boolean;
    type?: string;
  }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type || "text"}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("AdminQuickBookingWizard - Root Admin", () => {
  const rootAdminProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
    adminType: "root_admin" as const,
    managedIds: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("renders the wizard when open for root admin", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: "org-1", name: "Organization 1", slug: "org-1" },
      ]),
    });

    await act(async () => {
      render(<AdminQuickBookingWizard {...rootAdminProps} />);
    });
    
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Create Booking")).toBeInTheDocument();
  });

  it("shows organization selection step for root admin", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: "org-1", name: "Organization 1", slug: "org-1" },
        { id: "org-2", name: "Organization 2", slug: "org-2" },
      ]),
    });

    await act(async () => {
      render(<AdminQuickBookingWizard {...rootAdminProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Organization")).toBeInTheDocument();
    });
  });

  it("moves to club selection after selecting organization", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: "org-1", name: "Organization 1", slug: "org-1" },
        ]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([
          { id: "club-1", name: "Club 1", organizationId: "org-1" },
        ]),
      });

    await act(async () => {
      render(<AdminQuickBookingWizard {...rootAdminProps} />);
    });

    await waitFor(() => {
      expect(screen.getByLabelText("Organization")).toBeInTheDocument();
    });

    await act(async () => {
      const select = screen.getByLabelText("Organization");
      fireEvent.change(select, { target: { value: "org-1" } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Continue"));
    });

    await waitFor(() => {
      expect(screen.getByText("Select Club")).toBeInTheDocument();
    });
  });
});

describe("AdminQuickBookingWizard - Club Admin", () => {
  const clubAdminProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
    adminType: "club_admin" as const,
    managedIds: ["club-1"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("skips organization and club selection for club admin", async () => {
    await act(async () => {
      render(<AdminQuickBookingWizard {...clubAdminProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    expect(screen.queryByText("Select Organization")).not.toBeInTheDocument();
    expect(screen.queryByText("Select Club")).not.toBeInTheDocument();
  });
});

describe("AdminQuickBookingWizard - User Selection", () => {
  const orgAdminProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
    adminType: "organization_admin" as const,
    managedIds: ["org-1"],
    predefinedData: {
      clubId: "club-1",
      date: "2024-01-15",
      startTime: "10:00",
      duration: 60,
      courtId: "court-1",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows user list when available", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([
        { id: "user-1", name: "User One", email: "user1@example.com" },
        { id: "user-2", name: "User Two", email: "user2@example.com" },
      ]),
    });

    await act(async () => {
      render(<AdminQuickBookingWizard {...orgAdminProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select User")).toBeInTheDocument();
      expect(screen.getByLabelText("Existing User")).toBeInTheDocument();
    });
  });
});

describe("AdminQuickBookingWizard - Date & Time Selection", () => {
  const propsWithPredefinedUser = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
    adminType: "club_admin" as const,
    managedIds: ["club-1"],
    predefinedData: {
      clubId: "club-1",
      userId: "user-1",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows date and time selection when user is predefined", async () => {
    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithPredefinedUser} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
      expect(screen.getByLabelText("Date")).toBeInTheDocument();
      expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
      expect(screen.getByLabelText("Duration")).toBeInTheDocument();
    });
  });
});

describe("AdminQuickBookingWizard - Navigation", () => {
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
    adminType: "club_admin" as const,
    managedIds: ["club-1"],
    predefinedData: {
      clubId: "club-1",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it("shows cancel button on first step", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await act(async () => {
      render(<AdminQuickBookingWizard {...props} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });
  });

  it("calls onClose when cancel is clicked", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await act(async () => {
      render(<AdminQuickBookingWizard {...props} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Cancel"));
    });

    expect(props.onClose).toHaveBeenCalled();
  });
});
