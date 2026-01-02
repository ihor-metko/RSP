/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ClubCourtsPreview } from "@/components/admin/club/ClubCourtsPreview";
import type { ClubDetail } from "@/types/club";

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => {
    const translations: Record<string, string> = {
      "clubDetail.courts": "Courts",
      "clubDetail.addCourt": "Add Court",
      "clubDetail.viewAllCourts": "View All Courts",
      "clubDetail.noCourts": "No courts available",
      "clubDetail.priceRange": "Price Range",
      "clubDetail.usesClubHours": "Uses club hours",
      "common.active": "Active",
      "common.inactive": "Inactive",
      "common.indoor": "Indoor",
      "common.outdoor": "Outdoor",
    };
    return (key: string) => translations[key] || key;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

// Mock CourtsIcon
jest.mock("@/components/layout/AdminSidebar", () => ({
  CourtsIcon: () => <div data-testid="courts-icon">Courts Icon</div>,
}));

const mockClubBase: ClubDetail = {
  id: "club-1",
  organizationId: "org-1",
  name: "Test Club",
  slug: "test-club",
  shortDescription: "A test club",
  longDescription: null,
  location: "123 Test St",
  city: "Test City",
  country: "Test Country",
  latitude: null,
  longitude: null,
  phone: null,
  email: null,
  website: null,
  socialLinks: null,
  contactInfo: null,
  openingHours: null,
  metadata: null,
  defaultCurrency: null,
  timezone: null,
  isPublic: true,
  status: "active",
  tags: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  courts: [],
  coaches: [],
  gallery: [],
  businessHours: [],
};

describe("ClubCourtsPreview - Price Range", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not display price range when there are no courts", () => {
    const club = { ...mockClubBase, courts: [] };
    render(<ClubCourtsPreview club={club} />);

    expect(screen.queryByText("Price Range:")).not.toBeInTheDocument();
    expect(screen.getByText("No courts available")).toBeInTheDocument();
  });

  it("should display single price when all courts have the same price", () => {
    const club = {
      ...mockClubBase,
      courts: [
        {
          id: "court-1",
          clubId: "club-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          isActive: true,
          defaultPriceCents: 3000,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "court-2",
          clubId: "club-1",
          name: "Court 2",
          slug: "court-2",
          type: "padel",
          surface: "artificial",
          indoor: true,
          isActive: true,
          defaultPriceCents: 3000,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };

    render(<ClubCourtsPreview club={club} />);

    expect(screen.getByText("Price Range:")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    // Should not have a range separator
    expect(screen.queryByText("-")).not.toBeInTheDocument();
  });

  it("should display price range when courts have different prices", () => {
    const club = {
      ...mockClubBase,
      courts: [
        {
          id: "court-1",
          clubId: "club-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          isActive: true,
          defaultPriceCents: 2500,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "court-2",
          clubId: "club-1",
          name: "Court 2",
          slug: "court-2",
          type: "padel",
          surface: "artificial",
          indoor: false,
          isActive: true,
          defaultPriceCents: 4000,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "court-3",
          clubId: "club-1",
          name: "Court 3",
          slug: "court-3",
          type: "tennis",
          surface: "clay",
          indoor: true,
          isActive: true,
          defaultPriceCents: 3500,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };

    render(<ClubCourtsPreview club={club} />);

    expect(screen.getByText("Price Range:")).toBeInTheDocument();
    // Should display range from min to max
    expect(screen.getByText("$25.00 - $40.00")).toBeInTheDocument();
  });

  it("should display correct price range with inactive courts included", () => {
    const club = {
      ...mockClubBase,
      courts: [
        {
          id: "court-1",
          clubId: "club-1",
          name: "Court 1",
          slug: "court-1",
          type: "padel",
          surface: "artificial",
          indoor: true,
          isActive: true,
          defaultPriceCents: 3000,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        {
          id: "court-2",
          clubId: "club-1",
          name: "Court 2 (Inactive)",
          slug: "court-2",
          type: "padel",
          surface: "artificial",
          indoor: true,
          isActive: false,
          defaultPriceCents: 5000,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    };

    render(<ClubCourtsPreview club={club} />);

    expect(screen.getByText("Price Range:")).toBeInTheDocument();
    // Should include inactive courts in the price range calculation
    expect(screen.getByText("$30.00 - $50.00")).toBeInTheDocument();
  });
});
