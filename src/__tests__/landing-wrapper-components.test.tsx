/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MobileLandingWrapper } from "@/components/MobileLandingWrapper";
import { DesktopContentWrapper } from "@/components/DesktopContentWrapper";

// Mock the useIsMobile hook
jest.mock("@/hooks", () => ({
  useIsMobile: jest.fn(),
}));

// Mock LandingMobileView
jest.mock("@/components/mobile-views", () => ({
  LandingMobileView: () => <div data-testid="mobile-view">Mobile View</div>,
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock user store
jest.mock("@/stores/useUserStore", () => ({
  useUserStore: () => ({
    isLoggedIn: false,
  }),
}));

import { useIsMobile } from "@/hooks";

describe("MobileLandingWrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render LandingMobileView on mobile", async () => {
    (useIsMobile as jest.Mock).mockReturnValue(true);
    
    render(<MobileLandingWrapper />);
    
    await waitFor(() => {
      expect(screen.getByTestId("mobile-view")).toBeInTheDocument();
    });
  });

  it("should render nothing on desktop", () => {
    (useIsMobile as jest.Mock).mockReturnValue(false);
    const { container } = render(<MobileLandingWrapper />);
    
    expect(container.firstChild).toBeNull();
  });
});

describe("DesktopContentWrapper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render children on desktop", () => {
    (useIsMobile as jest.Mock).mockReturnValue(false);
    render(
      <DesktopContentWrapper>
        <div data-testid="desktop-content">Desktop Content</div>
      </DesktopContentWrapper>
    );
    
    expect(screen.getByTestId("desktop-content")).toBeInTheDocument();
  });

  it("should hide children on mobile after mount", async () => {
    (useIsMobile as jest.Mock).mockReturnValue(true);
    
    const { queryByTestId } = render(
      <DesktopContentWrapper>
        <div data-testid="desktop-content">Desktop Content</div>
      </DesktopContentWrapper>
    );
    
    // Initially renders (for SSR), then hides after mount
    await waitFor(() => {
      expect(queryByTestId("desktop-content")).not.toBeInTheDocument();
    });
  });
});
