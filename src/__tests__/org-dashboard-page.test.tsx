/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import OrgDashboardPage from "@/app/(pages)/admin/orgs/[orgId]/dashboard/page";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => {
      const translations: Record<string, string> = {
        "orgDashboard.loading": "Loading dashboard...",
        "orgDashboard.error": "Failed to load dashboard. Please try again later.",
        "orgDashboard.notFound": "Organization not found.",
        "orgDashboard.title": "Organization Dashboard",
        "orgDashboard.keyMetrics": "Key Metrics",
        "orgDashboard.metrics.clubs": "Clubs",
        "orgDashboard.metrics.courts": "Courts",
        "orgDashboard.metrics.bookingsToday": "Bookings Today",
        "orgDashboard.metrics.clubAdmins": "Club Admins",
        "orgDashboard.quickActions.title": "Quick Actions",
        "orgDashboard.quickActions.createClub": "Create Club",
        "orgDashboard.quickActions.inviteAdmin": "Invite Club Admin",
        "orgDashboard.navigation.manageClubs": "Manage Clubs",
        "orgDashboard.navigation.viewBookings": "View Bookings",
        "orgDashboard.navigation.manageAdmins": "Manage Admins",
        "sidebar.roleSuperAdmin": "Super Admin",
        "common.backToDashboard": "← Back to Dashboard",
        "common.settings": "Settings",
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

// Mock Button component from ui
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, variant }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}));

// Mock components that have CSS imports
jest.mock("@/components/admin/OrgHeader", () => {
  const MockOrgHeader = ({ orgName, orgSlug }: { orgName: string; orgSlug: string }) => (
    <header data-testid="org-header">
      <h1>{orgName}</h1>
      <p>/{orgSlug}</p>
    </header>
  );
  MockOrgHeader.displayName = "MockOrgHeader";
  return MockOrgHeader;
});

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

// Mock CreateAdminModal
jest.mock("@/components/admin/admin-wizard", () => ({
  CreateAdminModal: ({ isOpen }: { isOpen: boolean }) => {
    if (!isOpen) return null;
    return <div data-testid="create-admin-modal">Create Admin Modal</div>;
  },
}));

// Mock skeletons
jest.mock("@/components/ui/skeletons", () => ({
  PageHeaderSkeleton: ({ showDescription }: { showDescription?: boolean }) => (
    <div data-testid="page-header-skeleton">
      {showDescription && "Loading dashboard..."}
    </div>
  ),
  MetricCardSkeleton: () => <div data-testid="metric-card-skeleton">Loading metric...</div>,
}));

const mockUseSession = useSession as jest.Mock;
const mockUseRouter = useRouter as jest.Mock;
const mockUseParams = useParams as jest.Mock;

describe("OrgDashboardPage", () => {
  const mockOrgId = "org-123";
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush });
    mockUseParams.mockReturnValue({ orgId: mockOrgId });
    global.fetch = jest.fn();
  });

  it("should show loading state while session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    });

    render(<OrgDashboardPage />);

    // Check for skeleton loaders
    const skeletons = screen.getAllByTestId("metric-card-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should redirect to sign-in when not authenticated", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
    });
  });

  it("should display dashboard data when authenticated and authorized", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User", email: "test@example.com" },
      },
      status: "authenticated",
    });

    const mockDashboardData = {
      metrics: {
        clubsCount: 5,
        courtsCount: 12,
        bookingsToday: 8,
        clubAdminsCount: 3,
      },
      org: {
        id: mockOrgId,
        name: "Test Organization",
        slug: "test-org",
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(screen.getByTestId("org-header")).toBeInTheDocument();
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
    });

    expect(screen.getByTestId("key-metrics")).toBeInTheDocument();
    expect(screen.getByTestId("clubs-count")).toHaveTextContent("5");
    expect(screen.getByTestId("courts-count")).toHaveTextContent("12");
    expect(screen.getByTestId("bookings-today")).toHaveTextContent("8");
    expect(screen.getByTestId("admins-count")).toHaveTextContent("3");
  });

  it("should display quick action buttons", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User" },
      },
      status: "authenticated",
    });

    const mockDashboardData = {
      metrics: { clubsCount: 1, courtsCount: 2, bookingsToday: 3, clubAdminsCount: 1 },
      org: { id: mockOrgId, name: "Test Org", slug: "test-org" },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    });

    expect(screen.getByText("Create Club")).toBeInTheDocument();
    expect(screen.getByText("Invite Club Admin")).toBeInTheDocument();

    // Check create club link points to correct URL
    const createClubLink = screen.getByText("Create Club").closest("a");
    expect(createClubLink).toHaveAttribute("href", `/admin/orgs/${mockOrgId}/clubs/new`);

    // Check invite admin is a button (modal trigger, not a link)
    const inviteAdminButton = screen.getByText("Invite Club Admin").closest("button");
    expect(inviteAdminButton).toBeInTheDocument();
  });

  it("should display navigation links to management pages", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User" },
      },
      status: "authenticated",
    });

    const mockDashboardData = {
      metrics: { clubsCount: 1, courtsCount: 2, bookingsToday: 3, clubAdminsCount: 1 },
      org: { id: mockOrgId, name: "Test Org", slug: "test-org" },
    };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockDashboardData,
    });

    render(<OrgDashboardPage />);

    // Wait for Manage Clubs to appear (confirms dashboard loaded)
    await waitFor(() => {
      expect(screen.getByText("Manage Clubs")).toBeInTheDocument();
    }, { timeout: 3000 });

    // Check other navigation links exist
    expect(screen.getByText("View Bookings")).toBeInTheDocument();
    expect(screen.getByText("Manage Admins")).toBeInTheDocument();

    // Check navigation links point to correct URLs
    const manageClubsLink = screen.getByText("Manage Clubs").closest("a");
    expect(manageClubsLink).toHaveAttribute("href", `/admin/orgs/${mockOrgId}/clubs`);

    const viewBookingsLink = screen.getByText("View Bookings").closest("a");
    expect(viewBookingsLink).toHaveAttribute("href", `/admin/orgs/${mockOrgId}/bookings`);

    const manageAdminsLink = screen.getByText("Manage Admins").closest("a");
    expect(manageAdminsLink).toHaveAttribute("href", `/admin/orgs/${mockOrgId}/admins`);
  });

  it("should redirect to dashboard on 403 error", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User" },
      },
      status: "authenticated",
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
    });
  });

  it("should redirect to sign-in on 401 error", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User" },
      },
      status: "authenticated",
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/sign-in");
    });
  });

  it("should display not found message on 404 error", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User" },
      },
      status: "authenticated",
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Organization not found.")).toBeInTheDocument();
    });
  });

  it("should display error message on API failure", async () => {
    mockUseSession.mockReturnValue({
      data: {
        user: { id: "user-123", name: "Test User" },
      },
      status: "authenticated",
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    render(<OrgDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard. Please try again later.")).toBeInTheDocument();
    });

    // Should show back to dashboard button
    expect(screen.getByText("← Back to Dashboard")).toBeInTheDocument();
  });
});
