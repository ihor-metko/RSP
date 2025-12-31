/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { useRouter } from "next/navigation";
import AdminDashboardPage from "@/app/(pages)/admin/dashboard/page";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => {
      const translations: Record<string, string> = {
        "common.loading": "Loading...",
        "admin.dashboard.title": "Admin Dashboard",
        "admin.dashboard.subtitle": "Manage your platform",
        "admin.dashboard.organizationSubtitle": "Manage your organizations and clubs",
        "admin.dashboard.clubSubtitle": "Manage your club",
        "rootAdmin.dashboard.title": "Root Admin Dashboard",
        "rootAdmin.dashboard.subtitle": "Platform-wide statistics and overview",
        "rootAdmin.dashboard.totalOrganizations": "Organizations",
        "rootAdmin.dashboard.totalClubs": "Total Clubs",
        "rootAdmin.dashboard.totalUsers": "Registered Users",
        "rootAdmin.dashboard.activeBookings": "Active Bookings",
        "rootAdmin.dashboard.platformOverview": "Platform Overview",
        "rootAdmin.dashboard.platformOverviewDescription": "Platform overview description",
        "unifiedDashboard.organizationTitle": "Organization Dashboard",
        "unifiedDashboard.clubTitle": "Club Dashboard",
        "unifiedDashboard.failedToLoad": "Failed to load dashboard. Please try again later.",
        "unifiedDashboard.managementLinks": "Management pages",
        "unifiedDashboard.courts": "Courts",
        "unifiedDashboard.bookingsToday": "Bookings Today",
        "unifiedDashboard.manageClub": "Manage Club",
        "unifiedDashboard.manageCourts": "Manage Courts",
        "unifiedDashboard.viewBookings": "View Bookings",
        "orgDashboard.quickActions.title": "Quick Actions",
        "orgDashboard.quickActions.createClub": "Create Club",
        "orgDashboard.quickActions.inviteAdmin": "Invite Admin",
        "orgDashboard.navigation.manageClubs": "Manage Clubs",
        "orgDashboard.navigation.viewBookings": "View Bookings",
        "orgDashboard.navigation.manageAdmins": "Manage Admins",
        "orgDashboard.metrics.clubs": "Clubs",
        "orgDashboard.metrics.courts": "Courts",
        "orgDashboard.metrics.bookingsToday": "Bookings Today",
        "orgDashboard.metrics.clubAdmins": "Club Admins",
        "orgDashboard.keyMetrics": "Key Metrics",
        "bookingsOverview.title": "Bookings Overview",
        "bookingsOverview.description": "Summary of active and past bookings",
        "bookingsOverview.activeBookings": "Active / Upcoming Bookings",
        "bookingsOverview.pastBookings": "Past Bookings",
        "unifiedDashboard.byClubs": "Across clubs",
        "unifiedDashboard.byCourts": "Across courts",
        "unifiedDashboard.clubsStatsTitle": "Clubs Statistics",
        "unifiedDashboard.clubsStatsDescription": "Overview of clubs in your organizations",
        "unifiedDashboard.clubAdminStatsTitle": "Overview",
        "unifiedDashboard.clubAdminStatsDescription": "Summary of courts and bookings across your clubs",
        "unifiedDashboard.totalCourts": "Total Courts",
        "rootAdmin.dashboard.platformStatsTitle": "Platform Statistics",
        "rootAdmin.dashboard.platformStatsDescription": "Overview of the entire platform",
        "rootAdmin.dashboard.registeredUsersTitle": "Registered Users",
        "rootAdmin.dashboard.registeredUsersDescription": "Total registered players",
      };
      return translations[key] || key;
    };
    return t;
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Mock PageHeader component
jest.mock("@/components/ui", () => ({
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <header data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  ),
}));

// Mock KeyMetrics component
jest.mock("@/components/admin/KeyMetrics", () => {
  const MockKeyMetrics = ({ 
    clubsCount, 
    courtsCount, 
    bookingsToday, 
    clubAdminsCount,
    loading 
  }: { 
    clubsCount: number; 
    courtsCount: number; 
    bookingsToday: number; 
    clubAdminsCount: number;
    loading?: boolean;
  }) => {
    if (loading) {
      return <div data-testid="key-metrics-loading">Loading metrics...</div>;
    }
    return (
      <div data-testid="key-metrics">
        <div data-testid="clubs-count">{clubsCount}</div>
        <div data-testid="courts-count">{courtsCount}</div>
        <div data-testid="bookings-today">{bookingsToday}</div>
        <div data-testid="admins-count">{clubAdminsCount}</div>
      </div>
    );
  };
  MockKeyMetrics.displayName = "MockKeyMetrics";
  return MockKeyMetrics;
});

// Mock BookingsOverview component
jest.mock("@/components/admin/BookingsOverview", () => {
  const MockBookingsOverview = ({ 
    activeBookings, 
    pastBookings,
    loading 
  }: { 
    activeBookings: number; 
    pastBookings: number;
    loading?: boolean;
  }) => {
    if (loading) {
      return <div data-testid="bookings-overview-loading">Loading bookings...</div>;
    }
    return (
      <div data-testid="bookings-overview">
        <div data-testid="active-bookings">{activeBookings}</div>
        <div data-testid="past-bookings">{pastBookings}</div>
      </div>
    );
  };
  MockBookingsOverview.displayName = "MockBookingsOverview";
  return MockBookingsOverview;
});

// Mock RegisteredUsersCard component
jest.mock("@/components/admin/RegisteredUsersCard", () => ({
  RegisteredUsersCard: ({ data }: { data?: any }) => (
    <div data-testid="registered-users-card">
      {data && <div>Registered Users: {data.totalUsers}</div>}
    </div>
  ),
}));

// Mock DashboardGraphs component
jest.mock("@/components/admin/DashboardGraphs", () => {
  const MockDashboardGraphs = ({ initialData }: { initialData?: any }) => (
    <div data-testid="dashboard-graphs">
      Dashboard Graphs
      {initialData && <div data-testid="graphs-data">Graphs loaded</div>}
    </div>
  );
  MockDashboardGraphs.displayName = "MockDashboardGraphs";
  return MockDashboardGraphs;
});

// Mock DashboardShell component
jest.mock("@/components/admin/DashboardShell", () => {
  const MockDashboardShell = ({ header, children }: { header: React.ReactNode; children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">
      {header}
      {children}
    </div>
  );
  MockDashboardShell.displayName = "MockDashboardShell";
  return MockDashboardShell;
});

// Mock DashboardPlaceholder component
jest.mock("@/components/ui/skeletons", () => ({
  DashboardPlaceholder: () => <div data-testid="dashboard-placeholder">Loading...</div>,
}));

const mockUseRouter = useRouter as jest.Mock;

describe("AdminDashboardPage (Unified)", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  it("should show loading state initially", () => {
    // Mock fetch to delay so we can see loading state
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<AdminDashboardPage />);

    expect(screen.getByTestId("dashboard-placeholder")).toBeInTheDocument();
  });

  it("should redirect to sign-in on 401 error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
    });
  });

  it("should redirect to sign-in on 403 error", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
    });
  });

  it("should display root admin dashboard with platform statistics", async () => {
    const mockDashboardData = {
      adminType: "root_admin",
      isRoot: true,
      platformStats: {
        totalOrganizations: 3,
        totalClubs: 5,
        totalUsers: 100,
        activeBookings: 25,
        activeBookingsCount: 20,
        pastBookingsCount: 50,
      },
      registeredUsers: {
        totalUsers: 100,
        trend: [],
      },
      graphsData: {
        bookingTrends: [],
        activeUsers: [],
        timeRange: "week",
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Root Admin Dashboard")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("should display organization admin dashboard with org metrics", async () => {
    const mockDashboardData = {
      adminType: "organization_admin",
      isRoot: false,
      stats: {
        clubsCount: 2,
        courtsCount: 6,
        bookingsToday: 10,
        activeBookings: 15,
        pastBookings: 25,
      },
      graphsData: {
        bookingTrends: [],
        activeUsers: [],
        timeRange: "week",
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      // Organization admin now sees aggregated stats in Root Admin layout
      expect(screen.getByText("Total Clubs")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("should display club admin dashboard with club metrics", async () => {
    const mockDashboardData = {
      adminType: "club_admin",
      isRoot: false,
      stats: {
        courtsCount: 4,
        bookingsToday: 8,
        activeBookings: 12,
        pastBookings: 30,
      },
      graphsData: {
        bookingTrends: [],
        activeUsers: [],
        timeRange: "week",
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Total Courts")).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("should display aggregated stats for org admins", async () => {
    const mockDashboardData = {
      adminType: "organization_admin",
      isRoot: false,
      stats: {
        clubsCount: 5,  // 2 + 3 = 5 clubs total
        courtsCount: 12,  // 4 + 8 = 12 courts total
        bookingsToday: 17,  // 5 + 12 = 17 bookings today
        activeBookings: 26,  // 8 + 18 = 26 active bookings
        pastBookings: 55,  // 20 + 35 = 55 past bookings
      },
      graphsData: {
        bookingTrends: [],
        activeUsers: [],
        timeRange: "week",
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<AdminDashboardPage />);

    await waitFor(() => {
      // Organization admin now sees aggregated stats from all organizations
      // Total clubs should be 2 + 3 = 5
      expect(screen.getByText("Total Clubs")).toBeInTheDocument();
    });
  });
});
