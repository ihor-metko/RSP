/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockPush = jest.fn();
const mockRouter = {
  push: mockPush,
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
  replace: jest.fn(),
};

const mockParams = { clubId: "club-1" };

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  usePathname: () => "/admin/operations/club-1",
  useParams: () => mockParams,
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
  clubsById: {} as any,
  ensureClubById: jest.fn().mockResolvedValue({}),
  loading: false,
  clubs: [],
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
  PageHeader: ({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {description && <p>{description}</p>}
      {actions && <div data-testid="page-header-actions">{actions}</div>}
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
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("@/components/ui/skeletons", () => ({
  TableSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

jest.mock("@/components/club-operations", () => ({
  DayCalendar: () => <div data-testid="day-calendar">Calendar</div>,
  TodayBookingsList: () => <div data-testid="today-bookings">Today&apos;s Bookings</div>,
  BookingDetailModal: () => null,
  ConnectionStatusIndicator: () => <div data-testid="connection-status">Connected</div>,
}));

jest.mock("@/components/AdminQuickBookingWizard", () => ({
  AdminQuickBookingWizard: () => null,
}));

import ClubOperationsPage from "@/app/(pages)/admin/operations/[clubId]/page";

describe("ClubOperationsPage", () => {
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

      render(<ClubOperationsPage />);

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

      render(<ClubOperationsPage />);

      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("should show access denied for Club Admin accessing unauthorized club", () => {
      mockUserStore.isLoggedIn = true;
      mockUserStore.isLoading = false;
      mockUserStore.adminStatus = {
        isAdmin: true,
        adminType: "club_admin",
        managedIds: ["club-2"], // Different club
        assignedClub: {
          id: "club-2",
          name: "Other Club",
        },
      };

      render(<ClubOperationsPage />);

      expect(screen.getByText("operations.accessDenied")).toBeInTheDocument();
    });

    it("should allow Root Admin to access any club", async () => {
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

      mockClubStore.clubsById = {
        "club-1": {
          id: "club-1",
          name: "Test Club",
          location: "Test Location",
          status: "active",
          createdAt: new Date().toISOString(),
        } as any,
      };

      render(<ClubOperationsPage />);

      await waitFor(() => {
        expect(mockClubStore.ensureClubById).toHaveBeenCalledWith("club-1");
      });
    });
  });

  describe("Data Loading", () => {
    it("should load club data and bookings for authorized Club Admin", async () => {
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

      mockClubStore.clubsById = {
        "club-1": {
          id: "club-1",
          name: "Test Club",
          location: "Test Location",
          status: "active",
          createdAt: new Date().toISOString(),
        } as any,
      };

      render(<ClubOperationsPage />);

      await waitFor(() => {
        expect(mockClubStore.ensureClubById).toHaveBeenCalledWith("club-1");
        expect(mockCourtStore.fetchCourtsIfNeeded).toHaveBeenCalledWith({ clubId: "club-1" });
        expect(mockBookingStore.fetchBookingsForDay).toHaveBeenCalled();
      });
    });
  });

  describe("UI Rendering", () => {
    it("should render calendar and bookings list when data is loaded", async () => {
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

      mockClubStore.clubsById = {
        "club-1": {
          id: "club-1",
          name: "Test Club",
          location: "Test Location",
          status: "active",
          createdAt: new Date().toISOString(),
        } as any,
      };

      mockCourtStore.courts = [
        {
          id: "court-1",
          name: "Court 1",
          clubId: "club-1",
          sportType: "TENNIS",
          courtType: "OUTDOOR",
          status: "ACTIVE",
        } as any,
      ];

      render(<ClubOperationsPage />);

      await waitFor(() => {
        expect(screen.getByTestId("day-calendar")).toBeInTheDocument();
        expect(screen.getByTestId("today-bookings")).toBeInTheDocument();
      });
    });

    it("should show Back to List button", async () => {
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

      mockClubStore.clubsById = {
        "club-1": {
          id: "club-1",
          name: "Test Club",
          location: "Test Location",
          status: "active",
          createdAt: new Date().toISOString(),
        } as any,
      };

      render(<ClubOperationsPage />);

      // The back to list button is in the PageHeader actions
      await waitFor(() => {
        expect(screen.getByTestId("page-header")).toBeInTheDocument();
      });
      // Button text is from translation key
      expect(screen.getAllByTestId("button").length).toBeGreaterThan(0);
    });
  });
});
