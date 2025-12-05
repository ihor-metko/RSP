/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/layout/AdminSidebar";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

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

const mockUseSession = useSession as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

// Helper to mock fetch for admin-status API
const mockAdminStatusFetch = (adminStatus: {
  isAdmin: boolean;
  adminType: "root_admin" | "organization_admin" | "club_admin" | "none";
  isRoot: boolean;
  managedIds: string[];
  assignedClub?: { id: string; name: string };
}) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => adminStatus,
  });
};

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/admin/dashboard");
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Non-admin users", () => {
    it("does not render for player role", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-1",
            name: "John Player",
            email: "player@test.com",
            isRoot: false,
          },
        },
        status: "authenticated",
      });
      mockAdminStatusFetch({
        isAdmin: false,
        adminType: "none",
        isRoot: false,
        managedIds: [],
      });

      const { container } = render(<AdminSidebar />);
      
      await waitFor(() => {
        expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
      });
    });

    it("does not render for coach role", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-1",
            name: "Jane Coach",
            email: "coach@test.com",
            isRoot: false,
          },
        },
        status: "authenticated",
      });
      mockAdminStatusFetch({
        isAdmin: false,
        adminType: "none",
        isRoot: false,
        managedIds: [],
      });

      const { container } = render(<AdminSidebar />);
      
      await waitFor(() => {
        expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
      });
    });

    it("does not render for unauthenticated users", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      const { container } = render(<AdminSidebar />);
      expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
    });
  });

  describe("Root Admin", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-1",
            name: "Root Admin",
            email: "root@test.com",
            isRoot: true,
          },
        },
        status: "authenticated",
      });
      // Root admins are detected via isRoot flag, so no API call needed
      // but the component still checks for faster UX
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
      expect(screen.getByText("Bookings")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Global Settings")).toBeInTheDocument();
    });
  });

  describe("Organization Admin (Super Admin)", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-2",
            name: "Super Admin",
            email: "super@test.com",
            isRoot: false,
          },
        },
        status: "authenticated",
      });
      mockAdminStatusFetch({
        isAdmin: true,
        adminType: "organization_admin",
        isRoot: false,
        managedIds: ["org-1"],
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

  describe("Club Admin", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-3",
            name: "Club Admin",
            email: "admin@test.com",
            isRoot: false,
          },
        },
        status: "authenticated",
      });
      mockAdminStatusFetch({
        isAdmin: true,
        adminType: "club_admin",
        isRoot: false,
        managedIds: ["club-1"],
        assignedClub: { id: "club-1", name: "My Test Club" },
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
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-4",
            name: "Unassigned Admin",
            email: "unassigned@test.com",
            isRoot: false,
          },
        },
        status: "authenticated",
      });
      mockAdminStatusFetch({
        isAdmin: true,
        adminType: "club_admin",
        isRoot: false,
        managedIds: [],
        // No assignedClub
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
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-1",
            name: "Root Admin",
            email: "root@test.com",
            isRoot: true,
          },
        },
        status: "authenticated",
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

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-1",
            name: "Root Admin",
            email: "root@test.com",
            isRoot: true,
          },
        },
        status: "authenticated",
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
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-1",
            name: "Root Admin",
            email: "root@test.com",
            isRoot: true,
          },
        },
        status: "authenticated",
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
