/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { OperationsClubCardSelector } from "@/components/club-operations/OperationsClubCardSelector";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock AdminClubCard
jest.mock("@/components/admin/AdminClubCard", () => ({
  AdminClubCard: ({ club }: { club: { id: string; name: string } }) => (
    <div data-testid={`club-card-${club.id}`}>{club.name}</div>
  ),
}));

// Mock CardListSkeleton
jest.mock("@/components/ui/skeletons", () => ({
  CardListSkeleton: () => <div data-testid="skeleton">Loading...</div>,
}));

// Mock stores
const mockClubStore = {
  clubs: [
    {
      id: "club-1",
      name: "Test Club 1",
      organizationId: "org-1",
      location: "Test Location 1",
      status: "active",
      createdAt: "2024-01-01",
    },
    {
      id: "club-2",
      name: "Test Club 2",
      organizationId: "org-1",
      location: "Test Location 2",
      status: "active",
      createdAt: "2024-01-01",
    },
    {
      id: "club-3",
      name: "Test Club 3",
      organizationId: "org-2",
      location: "Test Location 3",
      status: "active",
      createdAt: "2024-01-01",
    },
  ],
  fetchClubsIfNeeded: jest.fn().mockResolvedValue(undefined),
  loadingClubs: false,
};

const mockUserStore = {
  user: { isRoot: true },
  adminStatus: {
    isAdmin: true,
    adminType: "root_admin",
    managedIds: [],
  },
};

jest.mock("@/stores/useClubStore", () => ({
  useClubStore: (selector: (state: typeof mockClubStore) => unknown) => {
    return selector(mockClubStore);
  },
}));

jest.mock("@/stores/useUserStore", () => ({
  useUserStore: (selector: (state: typeof mockUserStore) => unknown) => {
    return selector(mockUserStore);
  },
}));

describe("OperationsClubCardSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render club cards for root admin", () => {
    const mockOnChange = jest.fn();
    render(<OperationsClubCardSelector value="" onChange={mockOnChange} />);

    expect(screen.getByTestId("club-card-club-1")).toBeInTheDocument();
    expect(screen.getByTestId("club-card-club-2")).toBeInTheDocument();
    expect(screen.getByTestId("club-card-club-3")).toBeInTheDocument();
  });

  it("should call onChange when a club card is clicked", () => {
    const mockOnChange = jest.fn();
    render(<OperationsClubCardSelector value="" onChange={mockOnChange} />);

    const clubCard = screen.getByTestId("club-card-club-1").parentElement;
    fireEvent.click(clubCard!);

    expect(mockOnChange).toHaveBeenCalledWith("club-1");
  });

  it("should highlight selected club", () => {
    const mockOnChange = jest.fn();
    render(<OperationsClubCardSelector value="club-1" onChange={mockOnChange} />);

    const selectedCard = screen.getByTestId("club-card-club-1").parentElement;
    expect(selectedCard).toHaveClass("im-operations-club-card-selected");
  });

  it("should support keyboard navigation with Enter key", () => {
    const mockOnChange = jest.fn();
    render(<OperationsClubCardSelector value="" onChange={mockOnChange} />);

    const clubCard = screen.getByTestId("club-card-club-1").parentElement;
    fireEvent.keyDown(clubCard!, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith("club-1");
  });

  it("should support keyboard navigation with Space key", () => {
    const mockOnChange = jest.fn();
    render(<OperationsClubCardSelector value="" onChange={mockOnChange} />);

    const clubCard = screen.getByTestId("club-card-club-1").parentElement;
    fireEvent.keyDown(clubCard!, { key: " " });

    expect(mockOnChange).toHaveBeenCalledWith("club-1");
  });

  it("should have proper accessibility attributes", () => {
    const mockOnChange = jest.fn();
    render(<OperationsClubCardSelector value="club-1" onChange={mockOnChange} />);

    const selectedCard = screen.getByTestId("club-card-club-1").parentElement;
    expect(selectedCard).toHaveAttribute("role", "button");
    expect(selectedCard).toHaveAttribute("tabindex", "0");
    expect(selectedCard).toHaveAttribute("aria-pressed", "true");
  });
});
