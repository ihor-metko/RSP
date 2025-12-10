/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import ClubsPreview from "@/components/admin/ClubsPreview";
import type { UnifiedDashboardClub } from "@/app/api/admin/unified-dashboard/route";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubsPreview.title": "Clubs",
      "clubsPreview.noClubs": "No clubs available. Create your first club to get started.",
      "clubsPreview.viewAll": "View All Clubs",
      "clubsPreview.showMore": "Show {count} more clubs",
      "clubsPreview.courts": "Courts",
      "clubsPreview.bookingsToday": "Today",
      "clubsPreview.viewDetails": "View Details",
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

describe("ClubsPreview Component", () => {
  const mockClubs: UnifiedDashboardClub[] = [
    {
      id: "club-1",
      name: "Tennis Club One",
      slug: "tennis-club-one",
      organizationId: "org-1",
      organizationName: "Test Organization",
      courtsCount: 5,
      bookingsToday: 10,
      activeBookings: 15,
      pastBookings: 50,
    },
    {
      id: "club-2",
      name: "Padel Club Two",
      slug: "padel-club-two",
      organizationId: "org-1",
      organizationName: "Test Organization",
      courtsCount: 3,
      bookingsToday: 8,
      activeBookings: 12,
      pastBookings: 30,
    },
  ];

  it("should render loading state", () => {
    render(<ClubsPreview clubs={[]} loading={true} />);

    expect(screen.getByText("Clubs")).toBeInTheDocument();
    expect(screen.queryByText("No clubs available")).not.toBeInTheDocument();
  });

  it("should render empty state when no clubs", () => {
    render(<ClubsPreview clubs={[]} loading={false} />);

    expect(screen.getByText("Clubs")).toBeInTheDocument();
    expect(screen.getByText("No clubs available. Create your first club to get started.")).toBeInTheDocument();
  });

  it("should render list of clubs", () => {
    render(<ClubsPreview clubs={mockClubs} loading={false} />);

    expect(screen.getByText("Clubs")).toBeInTheDocument();
    expect(screen.getByText("Tennis Club One")).toBeInTheDocument();
    expect(screen.getByText("Padel Club Two")).toBeInTheDocument();
    expect(screen.getAllByText("Test Organization")).toHaveLength(2); // Appears for both clubs
  });

  it("should display club metrics", () => {
    render(<ClubsPreview clubs={mockClubs} loading={false} />);

    // Check that courts and bookings are displayed
    expect(screen.getAllByText("Courts")).toHaveLength(2); // Label appears twice
    expect(screen.getAllByText("Today")).toHaveLength(2); // Label appears twice
    expect(screen.getByText("5")).toBeInTheDocument(); // Tennis Club courts
    expect(screen.getByText("10")).toBeInTheDocument(); // Tennis Club bookings
    expect(screen.getByText("3")).toBeInTheDocument(); // Padel Club courts
    expect(screen.getByText("8")).toBeInTheDocument(); // Padel Club bookings
  });

  it("should render View All link with total count", () => {
    render(<ClubsPreview clubs={mockClubs} loading={false} />);

    const viewAllLink = screen.getByText(/View All Clubs/);
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink.textContent).toContain("(2)");
  });

  it("should render View All link with org context", () => {
    render(<ClubsPreview clubs={mockClubs} organizationId="org-123" loading={false} />);

    const viewAllLink = screen.getByText(/View All Clubs/).closest("a");
    expect(viewAllLink).toHaveAttribute("href", "/admin/orgs/org-123/clubs");
  });

  it("should render View Details links for each club", () => {
    render(<ClubsPreview clubs={mockClubs} loading={false} />);

    const viewDetailsLinks = screen.getAllByText("View Details");
    expect(viewDetailsLinks).toHaveLength(2);

    expect(viewDetailsLinks[0].closest("a")).toHaveAttribute("href", "/admin/clubs/club-1");
    expect(viewDetailsLinks[1].closest("a")).toHaveAttribute("href", "/admin/clubs/club-2");
  });

  it("should limit clubs to maxPreview and show 'Show More' button", () => {
    const manyClubs = Array.from({ length: 10 }, (_, i) => ({
      id: `club-${i}`,
      name: `Club ${i}`,
      slug: `club-${i}`,
      organizationId: "org-1",
      organizationName: "Test Organization",
      courtsCount: i + 1,
      bookingsToday: i * 2,
      activeBookings: i * 3,
      pastBookings: i * 5,
    }));

    render(<ClubsPreview clubs={manyClubs} maxPreview={3} loading={false} />);

    // Should show only first 3 clubs
    expect(screen.getByText("Club 0")).toBeInTheDocument();
    expect(screen.getByText("Club 1")).toBeInTheDocument();
    expect(screen.getByText("Club 2")).toBeInTheDocument();
    expect(screen.queryByText("Club 3")).not.toBeInTheDocument();

    // Should show "Show More" button
    expect(screen.getByText(/Show .* more clubs/)).toBeInTheDocument();
  });

  it("should not show 'Show More' button when clubs count <= maxPreview", () => {
    render(<ClubsPreview clubs={mockClubs} maxPreview={5} loading={false} />);

    expect(screen.queryByText(/Show .* more clubs/)).not.toBeInTheDocument();
  });
});
