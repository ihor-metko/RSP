import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { CourtPricingBlock } from "@/components/admin/court/CourtPricingBlock";
import type { CourtDetail } from "@/components/admin/court/types";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock IMLink component
jest.mock("@/components/ui", () => ({
  IMLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock formatPrice utility
jest.mock("@/utils/price", () => ({
  formatPrice: (cents: number) => `$${(cents / 100).toFixed(2)}`,
}));

describe("CourtPricingBlock", () => {
  const mockCourtWithWeekdayRules: CourtDetail = {
    id: "court-1",
    name: "Court 1",
    slug: "court-1",
    clubId: "club-1",
    type: "padel",
    surface: "artificial",
    indoor: true,
    sportType: "PADEL",
    isActive: true,
    defaultPriceCents: 5000,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    metadata: null,
    bannerData: null,
    club: {
      id: "club-1",
      name: "Test Club",
      businessHours: [],
    },
    courtPriceRules: [
      {
        id: "rule-1",
        courtId: "court-1",
        ruleType: "WEEKDAYS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "17:00",
        endTime: "21:00",
        priceCents: 6250,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
  };

  const mockCourtWithWeekendRules: CourtDetail = {
    ...mockCourtWithWeekdayRules,
    courtPriceRules: [
      {
        id: "rule-2",
        courtId: "court-1",
        ruleType: "WEEKENDS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "09:00",
        endTime: "18:00",
        priceCents: 7500,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
  };

  const mockCourtWithMultipleRules: CourtDetail = {
    ...mockCourtWithWeekdayRules,
    courtPriceRules: [
      {
        id: "rule-1",
        courtId: "court-1",
        ruleType: "WEEKDAYS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "17:00",
        endTime: "21:00",
        priceCents: 6250,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "rule-2",
        courtId: "court-1",
        ruleType: "WEEKENDS",
        dayOfWeek: null,
        date: null,
        holidayId: null,
        startTime: "09:00",
        endTime: "18:00",
        priceCents: 7500,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
  };

  const mockCourtWithoutRules: CourtDetail = {
    ...mockCourtWithWeekdayRules,
    courtPriceRules: [],
  };

  it("renders pricing block with default price", () => {
    render(<CourtPricingBlock court={mockCourtWithoutRules} />);
    expect(screen.getByText("$50.00/hour")).toBeInTheDocument();
  });

  it("displays weekday rules under Weekdays group", () => {
    render(<CourtPricingBlock court={mockCourtWithWeekdayRules} />);
    expect(screen.getByText("Weekdays (Mon-Fri)")).toBeInTheDocument();
    expect(screen.getByText("17:00 - 21:00")).toBeInTheDocument();
    expect(screen.getByText("$62.50")).toBeInTheDocument();
  });

  it("displays weekend rules under Weekends group", () => {
    render(<CourtPricingBlock court={mockCourtWithWeekendRules} />);
    expect(screen.getByText("Weekends (Sat-Sun)")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 18:00")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();
  });

  it("groups rules by type correctly", () => {
    render(<CourtPricingBlock court={mockCourtWithMultipleRules} />);
    
    // Check both groups are present
    expect(screen.getByText("Weekdays (Mon-Fri)")).toBeInTheDocument();
    expect(screen.getByText("Weekends (Sat-Sun)")).toBeInTheDocument();
    
    // Check both rules are displayed
    expect(screen.getByText("17:00 - 21:00")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 18:00")).toBeInTheDocument();
  });

  it("shows empty state when no rules exist", () => {
    render(<CourtPricingBlock court={mockCourtWithoutRules} />);
    expect(
      screen.getByText(/No custom pricing rules defined/i)
    ).toBeInTheDocument();
  });

  it("displays custom rules count", () => {
    render(<CourtPricingBlock court={mockCourtWithMultipleRules} />);
    expect(screen.getByText("2 custom rules")).toBeInTheDocument();
  });

  it("renders manage link to price-rules page", () => {
    render(<CourtPricingBlock court={mockCourtWithWeekdayRules} />);
    const manageLinks = screen.getAllByText("Manage");
    expect(manageLinks[0].closest("a")).toHaveAttribute(
      "href",
      "/admin/courts/court-1/price-rules"
    );
  });
});
