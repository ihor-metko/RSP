/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = {
  push: mockPush,
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  replace: mockReplace,
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/admin/operations",
  useParams: () => ({}),
  useSearchParams: () => ({
    get: jest.fn(),
    toString: () => "",
  }),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock stores
const mockUserStore = {
  adminStatus: null as any,
  isLoggedIn: false,
  isLoading: false,
  user: null as any,
};

const mockClubStore = {
  clubsById: {},
  ensureClubById: jest.fn().mockResolvedValue({}),
  loading: false,
  clubs: [],
  fetchClubsIfNeeded: jest.fn().mockResolvedValue(undefined),
  loadingClubs: false,
};

const mockCourtStore = {
  courts: [],
  fetchCourtsIfNeeded: jest.fn().mockResolvedValue(undefined),
  loading: false,
};

const mockBookingStore = {
  bookings: [],
  fetchBookingsForDay: jest.fn().mockResolvedValue([]),
  loading: false,
  error: null,
};

jest.mock("@/stores/useUserStore", () => ({
  useUserStore: (selector: (state: typeof mockUserStore) => any) => {
    return selector(mockUserStore);
  },
}));

jest.mock("@/stores/useClubStore", () => ({
  useClubStore: (selector?: (state: typeof mockClubStore) => any) => {
    if (selector) {
      return selector(mockClubStore);
    }
    return mockClubStore;
  },
}));

jest.mock("@/stores/useCourtStore", () => ({
  useCourtStore: (selector?: (state: typeof mockCourtStore) => any) => {
    if (selector) {
      return selector(mockCourtStore);
    }
    return mockCourtStore;
  },
}));

jest.mock("@/stores/useBookingStore", () => ({
  useBookingStore: (selector?: (state: typeof mockBookingStore) => any) => {
    if (selector) {
      return selector(mockBookingStore);
    }
    return mockBookingStore;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  PageHeader: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
  Button: ({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) => (
    <button onClick={onClick} data-testid="button">
      {children}
    </button>
  ),
  Input: ({ value, onChange }: { value: string; onChange: (e: any) => void }) => (
    <input data-testid="input" value={value} onChange={onChange} />
  ),
}));

jest.mock("@/components/ui/skeletons", () => ({
  TableSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

jest.mock("@/components/club-operations", () => ({
  DayCalendar: () => <div data-testid="day-calendar">Calendar</div>,
  TodayBookingsList: () => <div data-testid="today-bookings">Today&apos;s Bookings</div>,
  BookingDetailModal: () => null,
  OperationsClubSelector: ({ value, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => (
    <div data-testid="club-selector">
      <select
        data-testid="club-select"
        value={value}
        disabled={disabled}
      >
        <option value="">Select a club</option>
        <option value="club-1">Club 1</option>
        <option value="club-2">Club 2</option>
      </select>
    </div>
  ),
  OperationsClubCardSelector: () => (
    <div data-testid="club-selector">
      <div data-testid="club-card-selector">Club Card Selector</div>
    </div>
  ),
}));

import OperationsPage from "@/app/(pages)/admin/operations/page";

describe("OperationsPage - Initialization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock stores
    mockUserStore.adminStatus = null;
    mockUserStore.isLoggedIn = false;
    mockUserStore.isLoading = false;
    mockUserStore.user = null;
    mockClubStore.clubsById = {};
    mockClubStore.clubs = [];
    mockCourtStore.courts = [];
    mockBookingStore.bookings = [];
  });

  describe("Access Control", () => {
    it("should redirect to sign-in when user is not logged in", () => {
      mockUserStore.isLoggedIn = false;
      mockUserStore.isLoading = false;

      render(<OperationsPage />);

      expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
    });

    it("should redirect to home when user is not an admin", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: false,
        adminType: "none",
        managedIds: [],
      };

      render(<OperationsPage />);

      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("should show loading skeleton while user data is loading", () => {
      mockUserStore.isLoading = true;

      render(<OperationsPage />);

      expect(screen.getByTestId("skeleton")).toBeInTheDocument();
    });
  });

  describe("Club Admin Role", () => {
    it("should auto-redirect to assigned club for Club Admin", async () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-1"],
        assignedClub: {
          id: "club-1",
          name: "Test Club",
        },
      };

      render(<OperationsPage />);

      // Should redirect to the club-specific operations page
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/admin/operations/club-1");
      });
    });

    it("should show error when Club Admin has no assigned club", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "club_admin",
        managedIds: [],
        // No assignedClub
      };

      render(<OperationsPage />);

      expect(screen.getByText("operations.noClubAssigned")).toBeInTheDocument();
    });
  });

  describe("Organization Admin Role", () => {
    it("should show club selector for Organization Admin", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      };

      render(<OperationsPage />);

      // Should show the instruction and club selector
      expect(screen.getByTestId("club-selector")).toBeInTheDocument();
      expect(screen.getByText("operations.selectClubInstruction")).toBeInTheDocument();
    });

    it("should NOT auto-redirect for Organization Admin", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      };

      mockClubStore.clubs = [
        {
          id: "club-1",
          name: "Club 1",
          organizationId: "org-1",
        } as any,
      ];

      render(<OperationsPage />);

      // Should NOT redirect
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("should NOT show calendar/bookings on list page", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      };

      render(<OperationsPage />);

      // Should not show calendar or bookings list (this is the list page)
      expect(screen.queryByTestId("day-calendar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("today-bookings")).not.toBeInTheDocument();
    });
  });

  describe("Root Admin Role", () => {
    it("should show club selector for Root Admin", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.user = {
        id: "root-user",
        email: "root@example.com",
        name: "Root Admin",
        isRoot: true,
      };
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      };

      render(<OperationsPage />);

      // Should show the club selector
      expect(screen.getByTestId("club-selector")).toBeInTheDocument();
    });

    it("should NOT auto-select club for Root Admin", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.user = {
        id: "root-user",
        email: "root@example.com",
        name: "Root Admin",
        isRoot: true,
      };
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "root_admin",
        managedIds: [],
      };

      render(<OperationsPage />);

      // Should NOT fetch any data initially
      expect(mockClubStore.ensureClubById).not.toHaveBeenCalled();
      expect(mockCourtStore.fetchCourtsIfNeeded).not.toHaveBeenCalled();
      expect(mockBookingStore.fetchBookingsForDay).not.toHaveBeenCalled();
    });
  });

  describe("Data Fetching", () => {
    it("should fetch clubs list for Organization Admin", async () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      };

      render(<OperationsPage />);

      // Should fetch clubs list
      await waitFor(() => {
        expect(mockClubStore.fetchClubsIfNeeded).toHaveBeenCalled();
      });
    });

    it("should NOT fetch club details on list page", async () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "organization_admin",
        managedIds: ["org-1"],
      };

      render(<OperationsPage />);

      // Should NOT fetch individual club details or courts/bookings
      expect(mockClubStore.ensureClubById).not.toHaveBeenCalled();
      expect(mockCourtStore.fetchCourtsIfNeeded).not.toHaveBeenCalled();
      expect(mockBookingStore.fetchBookingsForDay).not.toHaveBeenCalled();
    });
  });
});
