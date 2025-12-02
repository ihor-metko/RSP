/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
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
        "playerDashboard.navigation.title": "Quick Navigation",
        "playerDashboard.navigation.profile": "Profile",
        "playerDashboard.navigation.home": "Home",
        "home.dashboard": "Dashboard",
        "home.manageClubs": "Manage Clubs",
        "home.manageCoaches": "Manage Coaches",
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
  IMLink: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className} data-testid={`imlink-${href}`}>{children}</a>
  ),
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
      expect(document.querySelector(".rsp-header-skeleton")).toBeInTheDocument();
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

    it("renders player-specific navigation links", () => {
      render(<Header />);
      // Check for player navigation links
      expect(screen.getByTestId("imlink-/dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("imlink-/trainings")).toBeInTheDocument();
      expect(screen.getByTestId("imlink-/clubs")).toBeInTheDocument();
    });

    it("displays user initials in avatar", () => {
      render(<Header />);
      expect(screen.getByText("JP")).toBeInTheDocument();
    });

    it("shows player role badge", () => {
      render(<Header />);
      expect(screen.getByText("Player")).toBeInTheDocument();
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

    it("renders coach-specific navigation links", () => {
      render(<Header />);
      expect(screen.getByTestId("imlink-/coach/dashboard")).toBeInTheDocument();
      expect(screen.getByTestId("imlink-/coach/requests")).toBeInTheDocument();
      expect(screen.getByTestId("imlink-/coach/availability")).toBeInTheDocument();
    });

    it("displays coach initials in avatar", () => {
      render(<Header />);
      expect(screen.getByText("JC")).toBeInTheDocument();
    });

    it("shows coach role badge", () => {
      render(<Header />);
      expect(screen.getByText("Coach")).toBeInTheDocument();
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
            role: "admin",
          },
        },
        status: "authenticated",
      });
    });

    it("renders admin-specific navigation links", () => {
      render(<Header />);
      expect(screen.getByTestId("imlink-/admin/clubs")).toBeInTheDocument();
      expect(screen.getByTestId("imlink-/admin/coaches")).toBeInTheDocument();
      expect(screen.getByTestId("imlink-/admin/notifications")).toBeInTheDocument();
    });

    it("displays admin initials in avatar", () => {
      render(<Header />);
      expect(screen.getByText("AU")).toBeInTheDocument();
    });

    it("shows admin role badge", () => {
      render(<Header />);
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
      const profileButton = screen.getByRole("button", { name: /profile/i });
      expect(profileButton).toHaveAttribute("aria-expanded", "false");
    });

    it("mobile menu toggle has aria-expanded attribute", () => {
      render(<Header />);
      const mobileToggle = screen.getByRole("button", { name: /actions/i });
      expect(mobileToggle).toHaveAttribute("aria-expanded", "false");
    });
  });
});
