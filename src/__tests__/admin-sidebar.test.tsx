/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
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

describe("AdminSidebar Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/admin/dashboard");
  });

  describe("Non-admin users", () => {
    it("does not render for player role", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-1",
            name: "John Player",
            email: "player@test.com",
            role: "player",
          },
        },
        status: "authenticated",
      });

      const { container } = render(<AdminSidebar />);
      expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
    });

    it("does not render for coach role", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-1",
            name: "Jane Coach",
            email: "coach@test.com",
            role: "coach",
          },
        },
        status: "authenticated",
      });

      const { container } = render(<AdminSidebar />);
      expect(container.querySelector(".im-sidebar")).not.toBeInTheDocument();
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
            role: "root_admin",
          },
        },
        status: "authenticated",
      });
    });

    it("renders the sidebar for root_admin role", () => {
      render(<AdminSidebar />);
      expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
    });

    it("shows Admin Panel title", () => {
      render(<AdminSidebar />);
      expect(screen.getByText("Admin Panel")).toBeInTheDocument();
    });

    it("shows Root Admin role badge", () => {
      render(<AdminSidebar />);
      expect(screen.getByText("Root Admin")).toBeInTheDocument();
    });

    it("shows all navigation items for root admin", () => {
      render(<AdminSidebar />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Platform Statistics")).toBeInTheDocument();
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("User Management")).toBeInTheDocument();
      expect(screen.getByText("Bookings")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
      expect(screen.getByText("Global Settings")).toBeInTheDocument();
    });

    it("expands user management section when clicked", () => {
      render(<AdminSidebar />);
      const userManagementBtn = screen.getByRole("button", { name: /user management/i });
      expect(userManagementBtn).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(userManagementBtn);
      expect(userManagementBtn).toHaveAttribute("aria-expanded", "true");

      // Should show nested items
      expect(screen.getByText("Super Admins")).toBeInTheDocument();
      expect(screen.getByText("Admins")).toBeInTheDocument();
      expect(screen.getByText("Coaches")).toBeInTheDocument();
    });
  });

  describe("Super Admin", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-2",
            name: "Super Admin",
            email: "super@test.com",
            role: "super_admin",
          },
        },
        status: "authenticated",
      });
    });

    it("renders the sidebar for super_admin role", () => {
      render(<AdminSidebar />);
      expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
    });

    it("shows Super Admin role badge", () => {
      render(<AdminSidebar />);
      expect(screen.getByText("Super Admin")).toBeInTheDocument();
    });

    it("does NOT show Platform Statistics (root admin only)", () => {
      render(<AdminSidebar />);
      expect(screen.queryByText("Platform Statistics")).not.toBeInTheDocument();
    });

    it("does NOT show Global Settings (root admin only)", () => {
      render(<AdminSidebar />);
      expect(screen.queryByText("Global Settings")).not.toBeInTheDocument();
    });

    it("shows User Management with limited nested items", () => {
      render(<AdminSidebar />);
      const userManagementBtn = screen.getByRole("button", { name: /user management/i });
      fireEvent.click(userManagementBtn);

      // Should NOT show Super Admins (root admin only)
      expect(screen.queryByText("Super Admins")).not.toBeInTheDocument();
      // Should show Admins and Coaches
      expect(screen.getByText("Admins")).toBeInTheDocument();
      expect(screen.getByText("Coaches")).toBeInTheDocument();
    });
  });

  describe("Admin", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-3",
            name: "Club Admin",
            email: "admin@test.com",
            role: "admin",
          },
        },
        status: "authenticated",
      });
    });

    it("renders the sidebar for admin role", () => {
      render(<AdminSidebar />);
      expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
    });

    it("shows Admin role badge", () => {
      render(<AdminSidebar />);
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });

    it("shows limited navigation items for admin", () => {
      render(<AdminSidebar />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Bookings")).toBeInTheDocument();
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    it("does NOT show User Management (root/super admin only)", () => {
      render(<AdminSidebar />);
      expect(screen.queryByText("User Management")).not.toBeInTheDocument();
    });

    it("does NOT show Platform Statistics (root admin only)", () => {
      render(<AdminSidebar />);
      expect(screen.queryByText("Platform Statistics")).not.toBeInTheDocument();
    });

    it("does NOT show Global Settings (root admin only)", () => {
      render(<AdminSidebar />);
      expect(screen.queryByText("Global Settings")).not.toBeInTheDocument();
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
            role: "root_admin",
          },
        },
        status: "authenticated",
      });
    });

    it("renders mobile toggle button", () => {
      render(<AdminSidebar />);
      const toggleBtn = document.querySelector(".im-sidebar-toggle");
      expect(toggleBtn).toBeInTheDocument();
    });

    it("mobile toggle button has correct aria-expanded attribute", () => {
      render(<AdminSidebar />);
      const toggleBtn = document.querySelector(".im-sidebar-toggle") as HTMLButtonElement;
      expect(toggleBtn).toHaveAttribute("aria-expanded", "false");
    });

    it("toggles sidebar open state on mobile toggle click", () => {
      render(<AdminSidebar />);
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

    it("shows overlay when sidebar is open on mobile", () => {
      render(<AdminSidebar />);
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
            role: "root_admin",
          },
        },
        status: "authenticated",
      });
    });

    it("has accessible navigation landmark", () => {
      render(<AdminSidebar />);
      expect(screen.getByRole("navigation", { name: /admin navigation/i })).toBeInTheDocument();
    });

    it("navigation items have menuitem role", () => {
      render(<AdminSidebar />);
      const menuItems = screen.getAllByRole("menuitem");
      expect(menuItems.length).toBeGreaterThan(0);
    });

    it("active link has aria-current attribute", () => {
      mockUsePathname.mockReturnValue("/admin/dashboard");
      render(<AdminSidebar />);

      const dashboardLink = screen.getByRole("menuitem", { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute("aria-current", "page");
    });

    it("expandable section has aria-controls", () => {
      render(<AdminSidebar />);
      const expandBtn = screen.getByRole("button", { name: /user management/i });
      expect(expandBtn).toHaveAttribute("aria-controls");
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
            role: "root_admin",
          },
        },
        status: "authenticated",
      });
    });

    it("highlights dashboard link when on dashboard page", () => {
      mockUsePathname.mockReturnValue("/admin/dashboard");
      render(<AdminSidebar />);

      const dashboardLink = screen.getByRole("menuitem", { name: /dashboard/i });
      expect(dashboardLink).toHaveClass("im-sidebar-nav-link--active");
    });

    it("highlights clubs link when on clubs page", () => {
      mockUsePathname.mockReturnValue("/admin/clubs");
      render(<AdminSidebar />);

      const clubsLink = screen.getByRole("menuitem", { name: /clubs/i });
      expect(clubsLink).toHaveClass("im-sidebar-nav-link--active");
    });

    it("highlights clubs link when on nested clubs page", () => {
      mockUsePathname.mockReturnValue("/admin/clubs/123");
      render(<AdminSidebar />);

      const clubsLink = screen.getByRole("menuitem", { name: /clubs/i });
      expect(clubsLink).toHaveClass("im-sidebar-nav-link--active");
    });
  });
});
