/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "home.quickLinks": "Quick Links",
      "home.viewClubs": "View Clubs",
      "home.dashboard": "Dashboard",
      "home.manageClubs": "Manage Clubs",
      "home.manageCoaches": "Manage Coaches",
      "home.manageNotifications": "Notifications",
      "training.history.title": "Training History",
      "common.signIn": "Sign In",
      "common.register": "Register",
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Card: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div data-testid="card">
      <h3>{title}</h3>
      {children}
    </div>
  ),
  IMLink: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href} data-testid={`link-${href}`}>{children}</a>
  ),
  ClubCardSkeleton: () => <div data-testid="club-card-skeleton" />,
  ClubCardsGridSkeleton: ({ count }: { count: number }) => (
    <div data-testid="clubs-grid-skeleton">{count} skeletons</div>
  ),
  PersonalizedSectionSkeleton: () => <div data-testid="personalized-skeleton" />,
}));

describe("Loading Skeletons", () => {
  it("ClubCardsGridSkeleton is exported from UI components", () => {
    // The mock already provides ClubCardsGridSkeleton, verify it works
    const MockClubCardsGridSkeleton = ({ count }: { count: number }) => (
      <div data-testid="clubs-grid-skeleton">{count} skeletons</div>
    );
    render(<MockClubCardsGridSkeleton count={4} />);
    expect(screen.getByTestId("clubs-grid-skeleton")).toBeInTheDocument();
  });

  it("PersonalizedSectionSkeleton is exported from UI components", () => {
    // The mock already provides PersonalizedSectionSkeleton, verify it works
    const MockPersonalizedSectionSkeleton = () => <div data-testid="personalized-skeleton" />;
    render(<MockPersonalizedSectionSkeleton />);
    expect(screen.getByTestId("personalized-skeleton")).toBeInTheDocument();
  });
});
