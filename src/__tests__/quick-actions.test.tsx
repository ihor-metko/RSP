/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import QuickActions from "@/components/admin/QuickActions";
import { useUserStore } from "@/stores/useUserStore";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "quickActions.title": "Quick Actions",
      "quickActions.description": "Perform common tasks quickly",
      "quickActions.createClub": "Create Club",
      "quickActions.createClubDescription": "Add a new club to your organization",
      "quickActions.inviteAdmin": "Invite Admin",
      "quickActions.inviteAdminDescription": "Invite a new administrator",
      "quickActions.createCourt": "Create Court",
      "quickActions.createCourtDescription": "Add a new court to this club",
    };
    return translations[key] || key;
  },
}));

// Mock next/link
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
});

// Mock useUserStore
jest.mock("@/stores/useUserStore");

const mockUseUserStore = useUserStore as jest.MockedFunction<typeof useUserStore>;

describe("QuickActions Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render nothing when user has no admin roles", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const mockState = {
        hasRole: () => false,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(mockState as any);
    });

    const { container } = render(<QuickActions />);
    expect(container.firstChild).toBeNull();
  });

  it("should render Create Club and Invite Admin actions for ROOT_ADMIN", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const mockState = {
        hasRole: (role: string) => role === "ROOT_ADMIN",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(mockState as any);
    });

    render(<QuickActions />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Create Club")).toBeInTheDocument();
    expect(screen.getByText("Invite Admin")).toBeInTheDocument();
    expect(screen.queryByText("Create Court")).not.toBeInTheDocument();
  });

  it("should render Create Club and Invite Admin actions for ORGANIZATION_ADMIN", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const mockState = {
        hasRole: (role: string) => role === "ORGANIZATION_ADMIN",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(mockState as any);
    });

    render(<QuickActions organizationId="org-123" />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Create Club")).toBeInTheDocument();
    expect(screen.getByText("Invite Admin")).toBeInTheDocument();

    // Check URLs contain org ID
    const createClubLink = screen.getByText("Create Club").closest("a");
    expect(createClubLink).toHaveAttribute("href", "/admin/orgs/org-123/clubs/new");
  });

  it("should render Create Court action for CLUB_ADMIN with clubId", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const mockState = {
        hasRole: (role: string) => role === "CLUB_ADMIN",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(mockState as any);
    });

    render(<QuickActions clubId="club-123" />);

    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("Create Court")).toBeInTheDocument();
    expect(screen.queryByText("Create Club")).not.toBeInTheDocument();
    expect(screen.queryByText("Invite Admin")).not.toBeInTheDocument();

    // Check URL contains club ID
    const createCourtLink = screen.getByText("Create Court").closest("a");
    expect(createCourtLink).toHaveAttribute("href", "/admin/clubs/club-123/courts/new");
  });

  it("should not render Create Court for CLUB_ADMIN without clubId", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const mockState = {
        hasRole: (role: string) => role === "CLUB_ADMIN",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(mockState as any);
    });

    const { container } = render(<QuickActions />);
    // Without clubId, club admin should see nothing
    expect(container.firstChild).toBeNull();
  });

  it("should render descriptions for all actions", () => {
    mockUseUserStore.mockImplementation((selector) => {
      const mockState = {
        hasRole: (role: string) => role === "ROOT_ADMIN",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return selector(mockState as any);
    });

    render(<QuickActions />);

    expect(screen.getByText("Add a new club to your organization")).toBeInTheDocument();
    expect(screen.getByText("Invite a new administrator")).toBeInTheDocument();
  });
});
