/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => {
      const translations: Record<string, string> = {
        "common.close": "Close",
        "sidebar.title": "Admin Panel",
        "sidebar.navigation": "Admin navigation",
        "sidebar.mainNavigation": "Main navigation",
        "sidebar.openMenu": "Open menu",
        "sidebar.dashboard": "Dashboard",
        "sidebar.statistics": "Platform Statistics",
        "sidebar.clubs": "Clubs",
        "sidebar.courts": "Courts",
        "sidebar.users": "User Management",
        "sidebar.superAdmins": "Super Admins",
        "sidebar.admins": "Admins",
        "sidebar.coaches": "Coaches",
        "sidebar.bookings": "Bookings",
        "sidebar.notifications": "Notifications",
        "sidebar.settings": "Global Settings",
        "sidebar.roleRootAdmin": "Root Admin",
        "sidebar.roleSuperAdmin": "Super Admin",
        "sidebar.roleAdmin": "Admin",
        "sidebar.roleOwner": "Owner",
        "sidebar.roleOwnerTooltip": "Organization Owner — full control over this organization",
        "sidebar.collapse": "Collapse",
        "sidebar.collapseSidebar": "Collapse sidebar",
        "sidebar.expandSidebar": "Expand sidebar",
        "sidebar.comingSoon": "Coming Soon",
        "sidebar.organization": "Organization",
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

// Mock useUserStore
const mockUserStore = {
  user: null,
  roles: [],
  isLoggedIn: false,
  isLoading: false,
  adminStatus: null,
  memberships: [],
  clubMemberships: [],
};

jest.mock("@/stores/useUserStore", () => ({
  useUserStore: jest.fn((selector) => {
    if (typeof selector === "function") {
      return selector(mockUserStore);
    }
    return mockUserStore;
  }),
}));

const mockUsePathname = usePathname as jest.Mock;

// Helper to set user store state
const setMockUserStore = (config: {
  user?: { id: string; name: string | null; email: string | null; isRoot: boolean } | null;
  adminStatus?: {
    isAdmin: boolean;
    adminType: "root_admin" | "organization_admin" | "club_admin" | "none";
    managedIds: string[];
    assignedClub?: { id: string; name: string };
    isPrimaryOwner?: boolean;
  } | null;
  isLoading?: boolean;
}) => {
  mockUserStore.user = config.user ?? null;
  mockUserStore.adminStatus = config.adminStatus ?? null;
  mockUserStore.isLoading = config.isLoading ?? false;
  mockUserStore.isLoggedIn = !!config.user;
};

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/admin/dashboard");
    // Reset mock user store
    mockUserStore.user = null;
    mockUserStore.adminStatus = null;
    mockUserStore.isLoading = false;
    mockUserStore.isLoggedIn = false;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Non-admin users", () => {
    it("does not render for player role", async () => {
      setMockUserStore({
        user: {
          id: "user-1",
          name: "John Player",
          email: "player@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: false,
          adminType: "none",
          managedIds: [],
        },
      });

      const { container } = render(<AdminSidebar />);
      
      await waitFor(() => {
        expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
      });
    });

    it("does not render for coach role", async () => {
      setMockUserStore({
        user: {
          id: "user-1",
          name: "Jane Coach",
          email: "coach@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: false,
          adminType: "none",
          managedIds: [],
        },
      });

      const { container } = render(<AdminSidebar />);
      
      await waitFor(() => {
        expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
      });
    });

    it("does not render for unauthenticated users", () => {
      setMockUserStore({
        user: null,
        adminStatus: null,
      });

      const { container } = render(<AdminSidebar />);
      expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
    });
  });

  describe("Root Admin", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-1",
          name: "Root Admin",
          email: "root@test.com",
          isRoot: true,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        },
      });
    });

    it("renders the sidebar for root_admin role", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
    });

    it("shows Admin Panel title", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Admin Panel")).toBeInTheDocument();
      });
    });

    it("shows Root Admin role badge", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Root Admin")).toBeInTheDocument();
      });
    });

    it("shows all navigation items for root admin", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
      });
      expect(screen.getByText("Platform Statistics")).toBeInTheDocument();
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Courts")).toBeInTheDocument();
      expect(screen.getByText("Bookings")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Global Settings")).toBeInTheDocument();
    });

    it("shows Courts navigation link with correct href", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Courts")).toBeInTheDocument();
      });
      const courtsLink = screen.getByRole("menuitem", { name: /Courts/i });
      expect(courtsLink).toHaveAttribute("href", "/admin/courts");
    });

    it("shows Platform Statistics as disabled with Coming Soon badge", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Platform Statistics")).toBeInTheDocument();
      });
      
      // Find the Platform Statistics menu item
      const statsItem = screen.getByText("Platform Statistics").closest(".im-sidebar-nav-link");
      
      // Verify it's disabled
      expect(statsItem).toHaveClass("im-sidebar-nav-link--disabled");
      expect(statsItem).toHaveAttribute("aria-disabled", "true");
      
      // Verify the Coming Soon badge is present
      expect(screen.getByText("Coming Soon")).toBeInTheDocument();
      const badge = screen.getByText("Coming Soon");
      expect(badge).toHaveClass("im-sidebar-badge--coming-soon");
    });

    it("Platform Statistics is not clickable when disabled", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Platform Statistics")).toBeInTheDocument();
      });
      
      // Find the Platform Statistics menu item
      const statsItem = screen.getByText("Platform Statistics").closest(".im-sidebar-nav-link");
      
      // Verify it's a div, not a link
      expect(statsItem?.tagName).toBe("DIV");
    });

    it("does NOT show Organization nav item (Root Admin already has Organizations list)", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      // Root admin should not see the singular "Organization" nav item
      // They have access to the full Organizations list instead
      expect(screen.queryByText("Organization")).not.toBeInTheDocument();
    });
  });

  describe("Organization Admin (Super Admin)", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-2",
          name: "Super Admin",
          email: "super@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "organization_admin",
          managedIds: ["org-1"],
        },
      });
    });

    it("renders the sidebar for organization_admin role", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
    });

    it("shows Super Admin role badge", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Super Admin")).toBeInTheDocument();
      });
    });

    it("shows Courts navigation link for organization admin", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      expect(screen.getByText("Courts")).toBeInTheDocument();
    });

    it("does NOT show Platform Statistics (root admin only)", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      expect(screen.queryByText("Platform Statistics")).not.toBeInTheDocument();
    });

    it("does NOT show Global Settings (root admin only)", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      expect(screen.queryByText("Global Settings")).not.toBeInTheDocument();
    });

    it("shows Organization nav item for single org SuperAdmin", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      // When collapsed, the label is in the title attribute
      // When expanded, the label is visible text
      // Let's expand the sidebar first
      const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
      fireEvent.click(collapseBtn);
      
      await waitFor(() => {
        expect(screen.getByText("Organization")).toBeInTheDocument();
      });
    });

    it("Organization nav item links to correct org detail page", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      
      // Expand sidebar to see labels
      const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
      fireEvent.click(collapseBtn);
      
      await waitFor(() => {
        const orgLink = screen.getByRole("menuitem", { name: /Organization/i });
        expect(orgLink).toHaveAttribute("href", "/admin/organizations/org-1");
      });
    });
  });

  describe("Organization Admin with multiple orgs", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-multi",
          name: "Multi Org Admin",
          email: "multiorg@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "organization_admin",
          managedIds: ["org-1", "org-2"],
        },
      });
    });

    it("does NOT show Organization nav item for multiple orgs (future enhancement)", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      // Should NOT show the Organization link when managing multiple orgs
      expect(screen.queryByText("Organization")).not.toBeInTheDocument();
    });
  });

  describe("Organization Owner (Primary Owner)", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-2",
          name: "Org Owner",
          email: "owner@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "organization_admin",
          managedIds: ["org-1"],
          isPrimaryOwner: true,
        },
      });
    });

    it("renders the sidebar for organization owner", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
    });

    it("shows Owner role badge for primary owner", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Owner")).toBeInTheDocument();
      });
    });

    it("shows Owner badge with tooltip for accessibility", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const ownerBadge = screen.getByText("Owner");
        expect(ownerBadge).toHaveAttribute("title", "Organization Owner — full control over this organization");
        expect(ownerBadge).toHaveAttribute("aria-label", "Organization Owner — full control over this organization");
      });
    });

    it("Owner badge has correct styling class", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const ownerBadge = screen.getByText("Owner");
        expect(ownerBadge).toHaveClass("im-sidebar-role--owner");
      });
    });
  });

  describe("Club Admin", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-3",
          name: "Club Admin",
          email: "admin@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "club_admin",
          managedIds: ["club-1"],
          assignedClub: { id: "club-1", name: "My Test Club" },
        },
      });
    });

    it("renders the sidebar for club_admin role", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
    });

    it("shows Admin role badge", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Admin")).toBeInTheDocument();
      });
    });

    it("shows direct link to assigned club for club admin", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
      });
      // ClubAdmin should see their assigned club name, not the generic "Clubs" link
      expect(screen.getByText("My Test Club")).toBeInTheDocument();
      expect(screen.queryByText("Clubs")).not.toBeInTheDocument();
      expect(screen.getByText("Courts")).toBeInTheDocument();
      expect(screen.getByText("Bookings")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("shows club link pointing to correct club dashboard", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByText("My Test Club")).toBeInTheDocument();
      });
      const clubLink = screen.getByRole("menuitem", { name: /My Test Club/i });
      expect(clubLink).toHaveAttribute("href", "/admin/clubs/club-1");
    });

    it("does NOT show Platform Statistics (root admin only)", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      expect(screen.queryByText("Platform Statistics")).not.toBeInTheDocument();
    });

    it("does NOT show Global Settings (root admin only)", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      expect(screen.queryByText("Global Settings")).not.toBeInTheDocument();
    });
  });

  describe("Club Admin without assigned club", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-4",
          name: "Unassigned Admin",
          email: "unassigned@test.com",
          isRoot: false,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "club_admin",
          managedIds: [],
          // No assignedClub
        },
      });
    });

    it("shows message when no club is assigned", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
      // Should show the "not assigned" message
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("Mobile behavior", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-1",
          name: "Root Admin",
          email: "root@test.com",
          isRoot: true,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        },
      });
    });

    it("renders mobile toggle button", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const toggleBtn = document.querySelector(".im-sidebar-toggle");
        expect(toggleBtn).toBeInTheDocument();
      });
    });

    it("mobile toggle button has correct aria-expanded attribute", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const toggleBtn = document.querySelector(".im-sidebar-toggle") as HTMLButtonElement;
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      });
    });

    it("toggles sidebar open state on mobile toggle click", async () => {
      render(<AdminSidebar />);
      
      await waitFor(() => {
        const sidebar = document.querySelector(".im-sidebar");
        expect(sidebar).toBeInTheDocument();
      });
      
      const toggleBtn = document.querySelector(".im-sidebar-toggle") as HTMLButtonElement;
      const sidebar = document.querySelector(".im-sidebar");

      // Initially closed on mobile (no --open class)
      expect(sidebar).not.toHaveClass("im-sidebar--open");

      // Click to open
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "true");
      expect(sidebar).toHaveClass("im-sidebar--open");

      // Click to close
      fireEvent.click(toggleBtn);
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
      expect(sidebar).not.toHaveClass("im-sidebar--open");
    });

    it("shows overlay when sidebar is open on mobile", async () => {
      render(<AdminSidebar />);
      
      await waitFor(() => {
        const toggleBtn = document.querySelector(".im-sidebar-toggle");
        expect(toggleBtn).toBeInTheDocument();
      });

      const toggleBtn = document.querySelector(".im-sidebar-toggle") as HTMLButtonElement;

      // Initially no overlay
      expect(document.querySelector(".im-sidebar-overlay")).not.toBeInTheDocument();

      // Open sidebar
      fireEvent.click(toggleBtn);
      expect(document.querySelector(".im-sidebar-overlay")).toBeInTheDocument();
    });
  });

  describe("Collapsible behavior", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-1",
          name: "Root Admin",
          email: "root@test.com",
          isRoot: true,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        },
      });
      // Clear localStorage before each test
      localStorage.clear();
    });

    it("renders collapse toggle button", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const collapseBtn = document.querySelector(".im-sidebar-collapse-btn");
        expect(collapseBtn).toBeInTheDocument();
      });
    });

    it("collapse button has correct aria-expanded attribute when expanded", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
        expect(collapseBtn).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("toggles collapsed state on collapse button click", async () => {
      render(<AdminSidebar />);
      
      await waitFor(() => {
        const sidebar = document.querySelector(".im-sidebar");
        expect(sidebar).toBeInTheDocument();
      });
      
      const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
      const sidebar = document.querySelector(".im-sidebar");

      // Initially expanded (no --collapsed class)
      expect(sidebar).not.toHaveClass("im-sidebar--collapsed");

      // Click to collapse
      fireEvent.click(collapseBtn);
      expect(sidebar).toHaveClass("im-sidebar--collapsed");
      expect(collapseBtn).toHaveAttribute("aria-expanded", "false");

      // Click to expand
      fireEvent.click(collapseBtn);
      expect(sidebar).not.toHaveClass("im-sidebar--collapsed");
      expect(collapseBtn).toHaveAttribute("aria-expanded", "true");
    });

    it("hides navigation labels when collapsed", async () => {
      render(<AdminSidebar />);
      
      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
      });
      
      const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
      
      // Click to collapse
      fireEvent.click(collapseBtn);
      
      // Check that sidebar has collapsed class
      const sidebar = document.querySelector(".im-sidebar");
      expect(sidebar).toHaveClass("im-sidebar--collapsed");
    });

    it("calls onCollapsedChange callback when collapsed state changes", async () => {
      const onCollapsedChange = jest.fn();
      render(<AdminSidebar onCollapsedChange={onCollapsedChange} />);
      
      await waitFor(() => {
        const collapseBtn = document.querySelector(".im-sidebar-collapse-btn");
        expect(collapseBtn).toBeInTheDocument();
      });
      
      const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
      
      // Click to collapse
      fireEvent.click(collapseBtn);
      expect(onCollapsedChange).toHaveBeenCalledWith(true);

      // Click to expand
      fireEvent.click(collapseBtn);
      expect(onCollapsedChange).toHaveBeenCalledWith(false);
    });

    it("persists collapsed state to localStorage", async () => {
      render(<AdminSidebar />);
      
      await waitFor(() => {
        const collapseBtn = document.querySelector(".im-sidebar-collapse-btn");
        expect(collapseBtn).toBeInTheDocument();
      });
      
      const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
      
      // Click to collapse
      fireEvent.click(collapseBtn);
      expect(localStorage.getItem("admin-sidebar-collapsed")).toBe("true");

      // Click to expand
      fireEvent.click(collapseBtn);
      expect(localStorage.getItem("admin-sidebar-collapsed")).toBe("false");
    });

    it("collapse button has accessible aria-label", async () => {
      render(<AdminSidebar />);
      
      await waitFor(() => {
        const collapseBtn = document.querySelector(".im-sidebar-collapse-btn") as HTMLButtonElement;
        expect(collapseBtn).toHaveAttribute("aria-label", "Collapse sidebar");
      });
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-1",
          name: "Root Admin",
          email: "root@test.com",
          isRoot: true,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        },
      });
    });

    it("has accessible navigation landmark", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
      });
    });

    it("navigation items have menuitem role", async () => {
      render(<AdminSidebar />);
      await waitFor(() => {
        const menuItems = screen.getAllByRole("menuitem");
        expect(menuItems.length).toBeGreaterThan(0);
      });
    });

    it("active link has aria-current attribute", async () => {
      mockUsePathname.mockReturnValue("/admin/dashboard");
      render(<AdminSidebar />);

      await waitFor(() => {
        const dashboardLink = screen.getByRole("menuitem", { name: /dashboard/i });
        expect(dashboardLink).toHaveAttribute("aria-current", "page");
      });
    });
  });

  describe("Active state", () => {
    beforeEach(() => {
      setMockUserStore({
        user: {
          id: "admin-1",
          name: "Root Admin",
          email: "root@test.com",
          isRoot: true,
        },
        adminStatus: {
          isAdmin: true,
          adminType: "root_admin",
          managedIds: [],
        },
      });
    });

    it("highlights dashboard link when on dashboard page", async () => {
      mockUsePathname.mockReturnValue("/admin/dashboard");
      render(<AdminSidebar />);

      await waitFor(() => {
        const dashboardLink = screen.getByRole("menuitem", { name: /dashboard/i });
        expect(dashboardLink).toHaveClass("im-sidebar-nav-link--active");
      });
    });

    it("highlights clubs link when on clubs page", async () => {
      mockUsePathname.mockReturnValue("/admin/clubs");
      render(<AdminSidebar />);

      await waitFor(() => {
        const clubsLink = screen.getByRole("menuitem", { name: /clubs/i });
        expect(clubsLink).toHaveClass("im-sidebar-nav-link--active");
      });
    });

    it("highlights clubs link when on nested clubs page", async () => {
      mockUsePathname.mockReturnValue("/admin/clubs/123");
      render(<AdminSidebar />);

      await waitFor(() => {
        const clubsLink = screen.getByRole("menuitem", { name: /clubs/i });
        expect(clubsLink).toHaveClass("im-sidebar-nav-link--active");
      });
    });
  });
});
