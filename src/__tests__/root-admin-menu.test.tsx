/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { signOut } from "next-auth/react";
import RootAdminMenu from "@/components/layout/RootAdminMenu";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  signOut: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => {
      const translations: Record<string, string> = {
        "rootAdmin.navigation.title": "Root Admin Navigation",
        "rootAdmin.navigation.menuLabel": "Root Admin Menu",
        "rootAdmin.navigation.roleLabel": "Root Admin",
        "rootAdmin.navigation.management": "Management",
        "rootAdmin.navigation.dashboard": "Dashboard",
        "rootAdmin.navigation.clubsManagement": "Clubs Management",
        "rootAdmin.navigation.superAdminsManagement": "Super Admins",
        "rootAdmin.navigation.usersManagement": "Users Management",
        "rootAdmin.navigation.platformSettings": "Platform Settings",
        "common.signOut": "Sign Out",
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

describe("RootAdminMenu Component", () => {
  const defaultProps = {
    userName: "Root Admin User",
    userEmail: "root@admin.com",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the trigger button with user initials", () => {
      render(<RootAdminMenu {...defaultProps} />);
      expect(screen.getByText("RU")).toBeInTheDocument();
    });

    it("renders trigger button with correct aria attributes", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    });

    it("displays dropdown menu when trigger is clicked", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("shows user info in the dropdown header", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByText("Root Admin User")).toBeInTheDocument();
      expect(screen.getByText("root@admin.com")).toBeInTheDocument();
    });

    it("shows Root Admin badge in the dropdown", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByText("Root Admin")).toBeInTheDocument();
    });
  });

  describe("Menu Items", () => {
    it("displays all required menu items", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Clubs Management")).toBeInTheDocument();
      expect(screen.getByText("Super Admins")).toBeInTheDocument();
      expect(screen.getByText("Users Management")).toBeInTheDocument();
      expect(screen.getByText("Platform Settings")).toBeInTheDocument();
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    it("has correct links for menu items", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByText("Dashboard").closest("a")).toHaveAttribute("href", "/admin/dashboard");
      expect(screen.getByText("Clubs Management").closest("a")).toHaveAttribute("href", "/admin/clubs");
      expect(screen.getByText("Super Admins").closest("a")).toHaveAttribute("href", "/admin/super-admins");
      expect(screen.getByText("Users Management").closest("a")).toHaveAttribute("href", "/admin/users");
      expect(screen.getByText("Platform Settings").closest("a")).toHaveAttribute("href", "/admin/settings");
    });

    it("displays Management section label", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByText("Management")).toBeInTheDocument();
    });
  });

  describe("Interactions", () => {
    it("toggles aria-expanded on click", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });

    it("closes dropdown when clicking outside", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("closes dropdown when clicking a menu item link", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      
      const dashboardLink = screen.getByText("Dashboard");
      fireEvent.click(dashboardLink);
      
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });

    it("calls signOut when logout button is clicked", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      const logoutButton = screen.getByText("Sign Out");
      fireEvent.click(logoutButton);
      
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });

  describe("Keyboard Navigation", () => {
    it("opens dropdown on Enter key", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.keyDown(trigger, { key: "Enter" });
      
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("opens dropdown on Space key", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.keyDown(trigger, { key: " " });
      
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("closes dropdown on Escape key", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      
      fireEvent.keyDown(trigger, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper menu semantics", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(0);
    });

    it("menu items are focusable", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      fireEvent.click(trigger);
      
      const menuItems = screen.getAllByRole("menuitem");
      menuItems.forEach((item) => {
        expect(item).toHaveAttribute("tabIndex", "0");
      });
    });

    it("has accessible trigger label", () => {
      render(<RootAdminMenu {...defaultProps} />);
      const trigger = screen.getByRole("button");
      
      expect(trigger).toHaveAttribute("aria-label", "Root Admin Menu - Root Admin User");
    });
  });

  describe("Edge Cases", () => {
    it("handles missing userName gracefully", () => {
      render(<RootAdminMenu userName={null} userEmail="root@admin.com" />);
      const trigger = screen.getByRole("button");
      
      // Should show initials as "RA" (default for Root Admin)
      expect(screen.getByText("RA")).toBeInTheDocument();
      
      fireEvent.click(trigger);
      
      // Should show email as name fallback (appears twice - in name and email fields)
      const emailTexts = screen.getAllByText("root@admin.com");
      expect(emailTexts.length).toBe(2);
    });

    it("handles single word name", () => {
      render(<RootAdminMenu userName="Admin" userEmail="admin@test.com" />);
      
      // Should show first letter only
      expect(screen.getByText("A")).toBeInTheDocument();
    });

    it("handles multi-word name correctly", () => {
      render(<RootAdminMenu userName="John Middle Doe" userEmail="admin@test.com" />);
      
      // Should show first and last initials
      expect(screen.getByText("JD")).toBeInTheDocument();
    });
  });
});
