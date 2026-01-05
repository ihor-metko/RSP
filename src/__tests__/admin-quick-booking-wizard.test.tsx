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
      "adminWizard.noTimeSlotsAvailable": "No available time slots left for today. Please select another date.",
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
      "court.type.single": "Single",
      "court.type.double": "Double",
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

// Mock Zustand stores
const mockOrganizationStore = {
  organizations: [] as any[],
  loading: false,
  error: null,
  getOrganizationsWithAutoFetch: jest.fn(() => []),
  getOrganizationById: jest.fn(() => null),
  fetchOrganizations: jest.fn(() => Promise.resolve()),
};

jest.mock("@/stores/useOrganizationStore", () => ({
  useOrganizationStore: Object.assign(
    jest.fn((selector) => {
      if (typeof selector === "function") {
        return selector(mockOrganizationStore);
      }
      return mockOrganizationStore;
    }),
    {
      getState: jest.fn(() => mockOrganizationStore),
    }
  ),
}));

const mockClubStore = {
  clubs: [] as any[],
  loading: false,
  error: null,
  fetchClubsIfNeeded: jest.fn(() => Promise.resolve()),
  getClubById: jest.fn(() => null),
};

jest.mock("@/stores/useClubStore", () => ({
  useClubStore: Object.assign(
    jest.fn((selector) => {
      if (typeof selector === "function") {
        return selector(mockClubStore);
      }
      return mockClubStore;
    }),
    {
      getState: jest.fn(() => mockClubStore),
    }
  ),
}));

const mockAdminUsersStore = {
  simpleUsers: [] as any[],
  loading: false,
  error: null,
  fetchSimpleUsers: jest.fn(() => Promise.resolve()),
};

jest.mock("@/stores/useAdminUsersStore", () => ({
  useAdminUsersStore: jest.fn((selector) => {
    if (typeof selector === "function") {
      return selector(mockAdminUsersStore);
    }
    return mockAdminUsersStore;
  }),
}));

const mockCourtStore = {
  courts: [] as any[],
  courtsById: {} as Record<string, any>,
  loading: false,
  error: null,
  ensureCourtById: jest.fn(() => Promise.resolve(null)),
};

jest.mock("@/stores/useCourtStore", () => ({
  useCourtStore: Object.assign(
    jest.fn((selector) => {
      if (typeof selector === "function") {
        return selector(mockCourtStore);
      }
      return mockCourtStore;
    }),
    {
      getState: jest.fn(() => mockCourtStore),
    }
  ),
}));

// Mock organization utility
jest.mock("@/utils/organization", () => ({
  toOrganizationOption: (org: any) => org,
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
    
    // Reset store mocks
    mockOrganizationStore.organizations = [];
    mockOrganizationStore.loading = false;
    mockOrganizationStore.error = null;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue([]);
    
    mockClubStore.clubs = [];
    mockClubStore.loading = false;
    mockClubStore.error = null;
    
    mockAdminUsersStore.simpleUsers = [];
    mockAdminUsersStore.loading = false;
    mockAdminUsersStore.error = null;
  });

  it("renders the wizard when open for root admin", async () => {
    const orgs = [{ id: "org-1", name: "Organization 1", slug: "org-1" }];
    
    mockOrganizationStore.organizations = orgs;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue(orgs);

    await act(async () => {
      render(<AdminQuickBookingWizard {...rootAdminProps} />);
    });
    
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Create Booking")).toBeInTheDocument();
  });

  it("shows organization selection step for root admin", async () => {
    const orgs = [
      { id: "org-1", name: "Organization 1", slug: "org-1" },
      { id: "org-2", name: "Organization 2", slug: "org-2" },
    ];
    
    mockOrganizationStore.organizations = orgs;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue(orgs);

    await act(async () => {
      render(<AdminQuickBookingWizard {...rootAdminProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Organization")).toBeInTheDocument();
    });
  });

  it("moves to club selection after selecting organization", async () => {
    const orgs = [{ id: "org-1", name: "Organization 1", slug: "org-1" }];
    const clubs = [
      { 
        id: "club-1", 
        name: "Club 1", 
        organization: { id: "org-1", name: "Organization 1" }
      }
    ];
    
    mockOrganizationStore.organizations = orgs;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue(orgs);
    mockClubStore.clubs = clubs;

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
    }, { timeout: 3000 });
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
    
    // Reset store mocks
    mockOrganizationStore.organizations = [];
    mockOrganizationStore.loading = false;
    mockOrganizationStore.error = null;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue([]);
    
    mockClubStore.clubs = [];
    mockClubStore.loading = false;
    mockClubStore.error = null;
    
    mockAdminUsersStore.simpleUsers = [];
    mockAdminUsersStore.loading = false;
    mockAdminUsersStore.error = null;
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
    
    // Reset store mocks
    mockOrganizationStore.organizations = [];
    mockOrganizationStore.loading = false;
    mockOrganizationStore.error = null;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue([]);
    
    mockClubStore.clubs = [];
    mockClubStore.loading = false;
    mockClubStore.error = null;
    
    mockAdminUsersStore.simpleUsers = [];
    mockAdminUsersStore.loading = false;
    mockAdminUsersStore.error = null;
  });

  it("shows date and time step first when court is predefined (to allow confirmation)", async () => {
    const users = [
      { id: "user-1", name: "User One", email: "user1@example.com" },
      { id: "user-2", name: "User Two", email: "user2@example.com" },
    ];
    
    mockAdminUsersStore.simpleUsers = users;

    await act(async () => {
      render(<AdminQuickBookingWizard {...orgAdminProps} />);
    });

    // With predefined court, Step 3 (DateTime) should be shown first to allow confirmation
    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    }, { timeout: 3000 });
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

describe("AdminQuickBookingWizard - Predefined Court Support", () => {
  const propsWithPredefinedCourt = {
    isOpen: true,
    onClose: jest.fn(),
    onBookingComplete: jest.fn(),
    adminType: "club_admin" as const,
    managedIds: ["club-1"],
    predefinedData: {
      clubId: "club-1",
      courtId: "court-1",
      date: "2024-01-15",
      startTime: "10:00",
      duration: 60,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    
    // Reset store mocks
    mockOrganizationStore.organizations = [];
    mockOrganizationStore.loading = false;
    mockOrganizationStore.error = null;
    mockOrganizationStore.getOrganizationsWithAutoFetch.mockReturnValue([]);
    
    mockClubStore.clubs = [];
    mockClubStore.loading = false;
    mockClubStore.error = null;
    
    mockAdminUsersStore.simpleUsers = [];
    mockAdminUsersStore.loading = false;
    mockAdminUsersStore.error = null;

    mockCourtStore.courts = [];
    mockCourtStore.courtsById = {};
    mockCourtStore.loading = false;
    mockCourtStore.error = null;
  });

  it("shows date and time step when court is predefined", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithPredefinedCourt} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // DateTime step should be shown to allow confirmation/adjustment
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(screen.getByLabelText("Start Time")).toBeInTheDocument();
    expect(screen.getByLabelText("Duration")).toBeInTheDocument();
  });

  it("does not show court selection step when court is predefined", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ timeline: [] }),
    });

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithPredefinedCourt} />);
    });

    // Wait for the DateTime step to appear
    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // Court selection step should not be visible at any point
    expect(screen.queryByText("Choose an available court")).not.toBeInTheDocument();
  });

  it("loads court data when court is predefined", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithPredefinedCourt} />);
    });

    await waitFor(() => {
      expect(mockCourtStore.ensureCourtById).toHaveBeenCalledWith(
        "court-1",
        { clubId: "club-1" }
      );
    });
  });

  it("shows predefined date, time, and duration correctly in Step3", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithPredefinedCourt} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // Verify all three predefined values are shown correctly
    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.value).toBe("2024-01-15");
    
    const timeSelect = screen.getByLabelText("Start Time") as HTMLSelectElement;
    expect(timeSelect.value).toBe("10:00");
    
    const durationSelect = screen.getByLabelText("Duration") as HTMLSelectElement;
    expect(durationSelect.value).toBe("60");
  });

  it("allows date and time adjustment with predefined court", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithPredefinedCourt} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // User should be able to modify the date
    const dateInput = screen.getByLabelText("Date");
    expect(dateInput).toHaveValue("2024-01-15");
    
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: "2024-01-16" } });
    });

    expect(dateInput).toHaveValue("2024-01-16");
  });

  it("preserves predefined date/time when reopening with new predefinedData", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);

    // First render with initial predefinedData
    const { rerender } = await act(async () => {
      return render(<AdminQuickBookingWizard {...propsWithPredefinedCourt} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // Verify initial values
    expect(screen.getByLabelText("Date")).toHaveValue("2024-01-15");
    expect(screen.getByLabelText("Start Time")).toHaveValue("10:00");
    expect(screen.getByLabelText("Duration")).toHaveValue("60");

    // Close the modal
    await act(async () => {
      rerender(<AdminQuickBookingWizard {...propsWithPredefinedCourt} isOpen={false} />);
    });

    // Reopen with different predefinedData
    const newProps = {
      ...propsWithPredefinedCourt,
      isOpen: true,
      predefinedData: {
        clubId: "club-1",
        courtId: "court-1",
        date: "2024-02-20",
        startTime: "14:30",
        duration: 90,
      },
    };

    await act(async () => {
      rerender(<AdminQuickBookingWizard {...newProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // Verify new values are shown
    expect(screen.getByLabelText("Date")).toHaveValue("2024-02-20");
    expect(screen.getByLabelText("Start Time")).toHaveValue("14:30");
    expect(screen.getByLabelText("Duration")).toHaveValue("90");
  });

  it("shows predefined date/time correctly in confirmation step", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    const mockUser = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
    };
    
    const mockClub = {
      id: "club-1",
      name: "Test Club",
      organizationId: "org-1",
      organization: { id: "org-1", name: "Test Org" },
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);
    mockClubStore.getClubById.mockReturnValue(mockClub);
    mockAdminUsersStore.simpleUsers = [mockUser];

    const propsWithUser = {
      ...propsWithPredefinedCourt,
      predefinedData: {
        ...propsWithPredefinedCourt.predefinedData,
        userId: "user-1",
      },
    };

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithUser} />);
    });

    // Wait for DateTime step
    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // Navigate to confirmation step by clicking Continue
    await act(async () => {
      fireEvent.click(screen.getByText("Continue"));
    });

    // Wait for confirmation step
    await waitFor(() => {
      expect(screen.getByText("Review the booking details and confirm")).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify date/time are shown in confirmation
    // The confirmation shows formatted date and time
    expect(screen.getByText("Monday, January 15, 2024")).toBeInTheDocument();
    expect(screen.getByText("10:00 - 11:00")).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === "60 minutes";
    })).toBeInTheDocument();
  });

  it("propagates date/time changes from Step3 to Step6 confirmation", async () => {
    const mockCourt = {
      id: "court-1",
      name: "Court 1",
      slug: "court-1",
      type: "Tennis",
      surface: "Hard",
      indoor: false,
      defaultPriceCents: 6000,
    };
    
    const mockUser = {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
    };
    
    const mockClub = {
      id: "club-1",
      name: "Test Club",
      organizationId: "org-1",
      organization: { id: "org-1", name: "Test Org" },
    };
    
    mockCourtStore.ensureCourtById.mockResolvedValue(mockCourt);
    mockClubStore.getClubById.mockReturnValue(mockClub);
    mockAdminUsersStore.simpleUsers = [mockUser];

    const propsWithUser = {
      ...propsWithPredefinedCourt,
      predefinedData: {
        ...propsWithPredefinedCourt.predefinedData,
        userId: "user-1",
      },
    };

    await act(async () => {
      render(<AdminQuickBookingWizard {...propsWithUser} />);
    });

    // Wait for DateTime step
    await waitFor(() => {
      expect(screen.getByText("Select Date and Time")).toBeInTheDocument();
    });

    // Change the date
    const dateInput = screen.getByLabelText("Date");
    await act(async () => {
      fireEvent.change(dateInput, { target: { value: "2024-01-20" } });
    });

    // Change the time
    const timeSelect = screen.getByLabelText("Start Time");
    await act(async () => {
      fireEvent.change(timeSelect, { target: { value: "15:30" } });
    });

    // Change the duration
    const durationSelect = screen.getByLabelText("Duration");
    await act(async () => {
      fireEvent.change(durationSelect, { target: { value: "90" } });
    });

    // Navigate to confirmation step
    await act(async () => {
      fireEvent.click(screen.getByText("Continue"));
    });

    // Wait for confirmation step
    await waitFor(() => {
      expect(screen.getByText("Review the booking details and confirm")).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify updated date/time are shown in confirmation
    expect(screen.getByText("Saturday, January 20, 2024")).toBeInTheDocument();
    expect(screen.getByText("15:30 - 17:00")).toBeInTheDocument();
    expect(screen.getByText((content, element) => {
      return element?.textContent === "90 minutes";
    })).toBeInTheDocument();
  });
});
