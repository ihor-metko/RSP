/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import KeyMetrics from "@/components/admin/KeyMetrics";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "orgDashboard.keyMetrics": "Key Metrics",
      "orgDashboard.metrics.clubs": "Clubs",
      "orgDashboard.metrics.courts": "Courts",
      "orgDashboard.metrics.bookingsToday": "Bookings Today",
      "orgDashboard.metrics.clubAdmins": "Club Admins",
    };
    return translations[key] || key;
  },
}));

// Mock skeleton component
jest.mock("@/components/ui/skeletons", () => ({
  MetricCardSkeleton: ({ size, variant }: { size: string; variant: string }) => (
    <div data-testid="metric-card-skeleton" data-size={size} data-variant={variant}>
      Skeleton
    </div>
  ),
}));

describe("KeyMetrics Loading State", () => {
  const defaultProps = {
    clubsCount: 5,
    courtsCount: 20,
    bookingsToday: 15,
    clubAdminsCount: 8,
  };

  it("should render skeleton when loading is true", () => {
    render(<KeyMetrics {...defaultProps} loading={true} />);
    
    const skeletons = screen.getAllByTestId("metric-card-skeleton");
    expect(skeletons).toHaveLength(4);
    
    // Verify all skeletons have correct size and variant
    skeletons.forEach((skeleton) => {
      expect(skeleton).toHaveAttribute("data-size", "lg");
      expect(skeleton).toHaveAttribute("data-variant", "stat");
    });
  });

  it("should render actual metrics when loading is false", () => {
    render(<KeyMetrics {...defaultProps} loading={false} />);
    
    // Should not have skeletons
    expect(screen.queryByTestId("metric-card-skeleton")).not.toBeInTheDocument();
    
    // Should display actual values
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("should have proper aria-busy when loading", () => {
    const { container } = render(<KeyMetrics {...defaultProps} loading={true} />);
    const grid = container.querySelector(".im-metrics-grid");
    expect(grid).toHaveAttribute("aria-busy", "true");
  });

  it("should render metrics with proper role when not loading", () => {
    const { container } = render(<KeyMetrics {...defaultProps} loading={false} />);
    const grid = container.querySelector(".im-metrics-grid");
    expect(grid).toHaveAttribute("role", "list");
  });

  it("should transition from loading to loaded state", () => {
    const { rerender } = render(<KeyMetrics {...defaultProps} loading={true} />);
    
    // Initially should show skeletons
    expect(screen.getAllByTestId("metric-card-skeleton")).toHaveLength(4);
    
    // After rerender with loading=false, should show actual data
    rerender(<KeyMetrics {...defaultProps} loading={false} />);
    expect(screen.queryByTestId("metric-card-skeleton")).not.toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});
