import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { PlayerBackNavigation } from "@/components/ui/PlayerBackNavigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "common.backToClubs": "← Back to Clubs",
    };
    return translations[key] || key;
  },
}));

describe("PlayerBackNavigation", () => {
  let mockPush: jest.Mock;
  let mockBack: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    mockBack = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      back: mockBack,
    });
    
    // Reset window.history.length
    Object.defineProperty(window, "history", {
      value: { length: 2 },
      writable: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should render with default text", () => {
    render(<PlayerBackNavigation />);
    expect(screen.getByText("← Back to Clubs")).toBeInTheDocument();
  });

  it("should render with custom text", () => {
    render(<PlayerBackNavigation text="← Back to Search" />);
    expect(screen.getByText("← Back to Search")).toBeInTheDocument();
  });

  it("should use router.back() when history is available", () => {
    Object.defineProperty(window, "history", {
      value: { length: 3 },
      writable: true,
    });

    render(<PlayerBackNavigation />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("should use router.push() to fallback URL when no history", () => {
    Object.defineProperty(window, "history", {
      value: { length: 1 },
      writable: true,
    });

    render(<PlayerBackNavigation fallbackUrl="/clubs" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/clubs");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("should use default fallback URL (/) when no history and no fallbackUrl provided", () => {
    Object.defineProperty(window, "history", {
      value: { length: 1 },
      writable: true,
    });

    render(<PlayerBackNavigation />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("should apply custom className", () => {
    render(<PlayerBackNavigation className="custom-class" />);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("player-back-nav");
    expect(button).toHaveClass("custom-class");
  });

  it("should have correct aria-label", () => {
    render(<PlayerBackNavigation text="← Back to Search" />);
    const button = screen.getByRole("button", { name: "← Back to Search" });
    expect(button).toBeInTheDocument();
  });

  it("should be a button element", () => {
    render(<PlayerBackNavigation />);
    const button = screen.getByRole("button");
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
  });
});
