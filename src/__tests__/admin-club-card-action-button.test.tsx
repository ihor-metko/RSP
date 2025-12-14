/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import type { ClubWithCounts } from "@/types/club";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubs.viewClub": "View Club",
      "common.published": "Published",
      "common.draft": "Draft",
    };
    return translations[key] || key;
  },
}));

// Mock image utils
jest.mock("@/utils/image", () => ({
  isValidImageUrl: jest.fn(() => false),
  getSupabaseStorageUrl: jest.fn((path) => path),
}));

// Mock sports constants
jest.mock("@/constants/sports", () => ({
  getSportName: jest.fn((sport) => sport),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  IMLink: ({ 
    children, 
    onClick, 
    href, 
    asButton, 
    variant, 
    className 
  }: { 
    children: React.ReactNode; 
    onClick?: () => void; 
    href?: string;
    asButton?: boolean;
    variant?: string;
    className?: string;
  }) => (
    <a 
      href={href} 
      onClick={onClick} 
      data-testid="im-link"
      data-as-button={asButton}
      data-variant={variant}
      className={className}
    >
      {children}
    </a>
  ),
  Button: ({ 
    children, 
    onClick, 
    variant, 
    className 
  }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    variant?: string;
    className?: string;
  }) => (
    <button 
      onClick={onClick} 
      data-testid="button"
      data-variant={variant}
      className={className}
    >
      {children}
    </button>
  ),
}));

const mockClub: ClubWithCounts = {
  id: "club-1",
  name: "Test Club",
  location: "Test Location",
  contactInfo: null,
  openingHours: null,
  logo: null,
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
  shortDescription: "Test Description",
  city: "Test City",
  heroImage: null,
  tags: null,
  isPublic: true,
  indoorCount: 2,
  outdoorCount: 1,
  courtCount: 3,
  bookingCount: 10,
  organizationId: "org-1",
  supportedSports: [],
};

describe("AdminClubCard - Action Button", () => {
  it("should render default View Club button when no actionButton prop is provided", () => {
    render(<AdminClubCard club={mockClub} />);
    
    const button = screen.getByTestId("im-link");
    expect(button).toHaveTextContent("View Club");
  });

  it("should render custom button with onClick when actionButton with onClick is provided", () => {
    const mockOnClick = jest.fn();
    render(
      <AdminClubCard
        club={mockClub}
        actionButton={{
          label: "Select Club",
          onClick: mockOnClick,
        }}
      />
    );
    
    const button = screen.getByTestId("button");
    expect(button).toHaveTextContent("Select Club");
    
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it("should render custom link when actionButton with href is provided", () => {
    render(
      <AdminClubCard
        club={mockClub}
        actionButton={{
          label: "Go to Dashboard",
          href: "/admin/dashboard",
        }}
      />
    );
    
    const link = screen.getByTestId("im-link");
    expect(link).toHaveTextContent("Go to Dashboard");
    expect(link).toHaveAttribute("href", "/admin/dashboard");
  });

  it("should use default href when actionButton has label but no onClick or href", () => {
    render(
      <AdminClubCard
        club={mockClub}
        actionButton={{
          label: "Custom Label",
        }}
      />
    );
    
    const link = screen.getByTestId("im-link");
    expect(link).toHaveTextContent("Custom Label");
    expect(link).toHaveAttribute("href", `/admin/clubs/${mockClub.id}`);
  });

  it("should prioritize onClick over href when both are provided", () => {
    const mockOnClick = jest.fn();
    render(
      <AdminClubCard
        club={mockClub}
        actionButton={{
          label: "Select Club",
          onClick: mockOnClick,
          href: "/should-not-be-used",
        }}
      />
    );
    
    // Should render button, not link
    const button = screen.getByTestId("button");
    expect(button).toBeInTheDocument();
    expect(screen.queryByTestId("im-link")).not.toBeInTheDocument();
  });
});
