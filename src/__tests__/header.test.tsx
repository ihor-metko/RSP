/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { useSession } from "next-auth/react";
import Header from "@/components/layout/Header";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string, values?: Record<string, string>) => {
      const translations: Record<string, string> = {
        "home.title": "Padel Club MVP",
        "common.signIn": "Sign In",
        "common.signOut": "Sign Out",
        "common.register": "Register",
        "common.noRole": "No Role",
        "common.search": "Search",
        "common.close": "Close",
        "common.actions": "Actions",
        "common.settings": "Settings",
        "common.courts": "Courts",
        "common.events": "Events",
        "playerDashboard.navigation.title": "Quick Navigation",
        "playerDashboard.navigation.profile": "Profile",
        "playerDashboard.navigation.home": "Home",
        "home.dashboard": "Dashboard",
        "home.manageClubs": "Manage Clubs",
        "home.manageCoaches": "Manage Coaches",
        "home.coaches": "Coaches",
        "home.manageNotifications": "Notifications",
        "training.history.title": "My Training Sessions",
        "clubs.title": "Clubs",
        "coach.dashboard.title": "Coach Dashboard",
        "coach.requests.title": "Training Requests",
        "coach.availability.title": "Availability Management",
        "admin.clubs.title": "Admin - Clubs",
        "admin.coaches.roles.admin": "Admin",
        "admin.coaches.roles.coach": "Coach",
        "admin.coaches.roles.player": "Player",
      };
      let result = translations[key] || key;
      if (values) {
        Object.entries(values).forEach(([k, v]) => {
          result = result.replace(`{${k}}`, v);
        });
      }
      return result;
    };
    return t;
  },
}));

// Mock useCurrentLocale hook
jest.mock("@/hooks/useCurrentLocale", () => ({
  useCurrentLocale: () => "en",
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  DarkModeToggle: () => <button data-testid="dark-mode-toggle">Toggle Theme</button>,
  LanguageSwitcher: () => <button data-testid="language-switcher">Language</button>,
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

describe("Header Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Unauthenticated state", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("renders the header with brand title", () => {
      render(<Header />);
      expect(screen.getByText("Padel Club MVP")).toBeInTheDocument();
    });

    it("shows sign in and register links for unauthenticated users", () => {
      render(<Header />);
      expect(screen.getByText("Sign In")).toBeInTheDocument();
      expect(screen.getByText("Register")).toBeInTheDocument();
    });

    it("renders language switcher and dark mode toggle", () => {
      render(<Header />);
      expect(screen.getByTestId("language-switcher")).toBeInTheDocument();
      expect(screen.getByTestId("dark-mode-toggle")).toBeInTheDocument();
    });

    it("does not render profile button", () => {
      render(<Header />);
      expect(screen.queryByLabelText("Profile")).not.toBeInTheDocument();
    });

    it("renders primary navigation links for all users", () => {
      render(<Header />);
      // Primary nav items should be visible to all users
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Courts")).toBeInTheDocument();
      expect(screen.getByText("Coaches")).toBeInTheDocument();
      expect(screen.getByText("Events")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
      });
    });

    it("shows skeleton loader when loading", () => {
      render(<Header />);
      expect(document.querySelector(".im-header-skeleton")).toBeInTheDocument();
    });
  });

  describe("Player role", () => {
    beforeEach(() => {
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
    });

    it("renders primary navigation links", () => {
      render(<Header />);
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Courts")).toBeInTheDocument();
      expect(screen.getByText("Coaches")).toBeInTheDocument();
      expect(screen.getByText("Events")).toBeInTheDocument();
    });

    it("displays user initials in avatar", () => {
      render(<Header />);
      expect(screen.getByText("JP")).toBeInTheDocument();
    });

    it("does NOT show player role badge in the header", () => {
      render(<Header />);
      // Per requirements: No role displayed in header for player users
      // The role should only be shown inside dropdown for admin users
      const roleTexts = screen.queryAllByText("Player");
      // Should not have any role text visible in header (only in dropdown when opened)
      expect(roleTexts.length).toBe(0);
    });

    it("renders user menu with profile button", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*john player/i });
      expect(profileButton).toBeInTheDocument();
    });
  });

  describe("Coach role", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "coach-1",
            name: "Jane Coach",
            email: "coach@test.com",
            role: "coach",
          },
        },
        status: "authenticated",
      });
    });

    it("renders primary navigation links", () => {
      render(<Header />);
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Courts")).toBeInTheDocument();
    });

    it("displays coach initials in avatar", () => {
      render(<Header />);
      expect(screen.getByText("JC")).toBeInTheDocument();
    });

    it("does NOT show coach role badge in the header", () => {
      render(<Header />);
      // Per requirements: No role displayed in header
      const roleTexts = screen.queryAllByText("Coach");
      expect(roleTexts.length).toBe(0);
    });
  });

  describe("Admin role", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "admin-1",
            name: "Admin User",
            email: "admin@test.com",
            role: "super_admin",
          },
        },
        status: "authenticated",
      });
    });

    it("renders primary navigation links", () => {
      render(<Header />);
      expect(screen.getByText("Clubs")).toBeInTheDocument();
      expect(screen.getByText("Courts")).toBeInTheDocument();
    });

    it("displays admin initials in avatar", () => {
      render(<Header />);
      expect(screen.getByText("AU")).toBeInTheDocument();
    });

    it("shows admin badge in dropdown when opened", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*admin user/i });
      fireEvent.click(profileButton);
      // Admin badge should be visible in dropdown
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  describe("Props", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });
    });

    it("uses custom title when provided", () => {
      render(<Header title="Custom Title" />);
      expect(screen.getByText("Custom Title")).toBeInTheDocument();
    });

    it("hides profile section when hideProfile is true", () => {
      render(<Header hideProfile />);
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
      expect(screen.queryByText("Register")).not.toBeInTheDocument();
    });

    it("shows search input when showSearch is true", () => {
      render(<Header showSearch />);
      expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    });

    it("hides search input by default", () => {
      render(<Header />);
      expect(screen.queryByPlaceholderText("Search")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-1",
            name: "Test User",
            email: "test@test.com",
            role: "player",
          },
        },
        status: "authenticated",
      });
    });

    it("has accessible navigation landmark", () => {
      render(<Header />);
      expect(screen.getByRole("navigation")).toBeInTheDocument();
    });

    it("profile button has aria-expanded attribute", () => {
      render(<Header />);
      // The profile button uses "Actions - username" pattern for aria-label
      const profileButton = screen.getByRole("button", { name: /actions.*test user/i });
      expect(profileButton).toHaveAttribute("aria-expanded", "false");
    });

    it("mobile menu toggle has aria-expanded attribute", () => {
      render(<Header />);
      // Find the mobile toggle button specifically (not the user menu button)
      const mobileToggle = document.querySelector(".im-header-mobile-toggle") as HTMLButtonElement;
      expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    });

    it("profile button toggles aria-expanded on click", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*test user/i });
      expect(profileButton).toHaveAttribute("aria-expanded", "false");
      
      fireEvent.click(profileButton);
      expect(profileButton).toHaveAttribute("aria-expanded", "true");
    });

    it("dropdown has role=menu and menuitem semantics", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*test user/i });
      fireEvent.click(profileButton);
      
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getAllByRole("menuitem").length).toBeGreaterThan(0);
    });
  });

  describe("UserMenu Integration", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "user-1",
            name: "Test User",
            email: "test@test.com",
            role: "player",
          },
        },
        status: "authenticated",
      });
    });

    it("shows user name and email in dropdown", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*test user/i });
      fireEvent.click(profileButton);
      
      expect(screen.getByText("Test User")).toBeInTheDocument();
      expect(screen.getByText("test@test.com")).toBeInTheDocument();
    });

    it("shows menu items with outline icons", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*test user/i });
      fireEvent.click(profileButton);
      
      // Check menu items are present
      expect(screen.getByText("Profile")).toBeInTheDocument();
      expect(screen.getByText("My Training Sessions")).toBeInTheDocument();
      expect(screen.getByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Sign Out")).toBeInTheDocument();
    });

    it("closes dropdown when clicking outside", () => {
      render(<Header />);
      const profileButton = screen.getByRole("button", { name: /actions.*test user/i });
      fireEvent.click(profileButton);
      
      expect(screen.getByRole("menu")).toBeInTheDocument();
      
      // Click outside
      fireEvent.mouseDown(document.body);
      
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
