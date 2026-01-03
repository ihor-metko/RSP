/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "common.search": "Search",
      "clubs.searchPlaceholder": "Search clubs...",
      "clubs.cityPlaceholder": "City",
      "clubs.clearFilters": "Clear filters",
    };
    return translations[key] || key;
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Mock UI components
jest.mock("@/components/ui", () => {
  return {
    Input: React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
      function Input(props, ref) {
        return <input ref={ref} {...props} />;
      }
    ),
    Button: function Button({
      children,
      onClick,
      type,
      disabled,
      className,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      type?: "button" | "submit";
      disabled?: boolean;
      className?: string;
    }) {
      return (
        <button onClick={onClick} type={type} disabled={disabled} className={className}>
          {children}
        </button>
      );
    },
  };
});

import { PublicSearchBar } from "@/components/PublicSearchBar";

describe("Club Search UX Improvements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Reset Filters Button", () => {
    it("should always be visible on clubs page (not navigateOnSearch mode)", () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      // Reset button should be present even with no filters
      const resetButton = screen.getByText("Clear filters");
      expect(resetButton).toBeInTheDocument();
    });

    it("should be disabled when no filters are active", () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      const resetButton = screen.getByText("Clear filters");
      expect(resetButton).toBeDisabled();
    });

    it("should be enabled when filters are active", () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar initialQ="test" onSearch={mockOnSearch} />);

      const resetButton = screen.getByText("Clear filters");
      expect(resetButton).toBeEnabled();
    });

    it("should not cause layout shifts when filters change", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      // Button should be present initially
      const resetButton = screen.getByText("Clear filters");
      expect(resetButton).toBeInTheDocument();
      expect(resetButton).toBeDisabled();

      // Type in search field
      const searchInput = screen.getByPlaceholderText("Search clubs...");
      fireEvent.change(searchInput, { target: { value: "Lviv" } });

      // Button should still be present, just enabled now
      const resetButtonAfter = screen.getByText("Clear filters");
      expect(resetButtonAfter).toBeInTheDocument();
      expect(resetButtonAfter).toBeEnabled();
      
      // Same button element (no remounting)
      expect(resetButton).toBe(resetButtonAfter);
    });
  });

  describe("Search Button", () => {
    it("should be visible on clubs page (not navigateOnSearch mode)", () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      // Search button should be present
      const searchButtons = screen.getAllByText("Search");
      expect(searchButtons.length).toBeGreaterThan(0);
    });

    it("should trigger search when clicked", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText("Search clubs...");
      fireEvent.change(searchInput, { target: { value: "Lviv" } });

      const searchButton = screen.getByText("Search");
      fireEvent.click(searchButton);

      // Should call onSearch immediately (skipping debounce)
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith({ q: "Lviv", city: "" });
      });
    });

    it("should trigger search on Enter key press", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText("Search clubs...");
      fireEvent.change(searchInput, { target: { value: "Lviv" } });
      
      // Press Enter to submit the form
      fireEvent.submit(searchInput.closest("form")!);

      // Should call onSearch immediately (skipping debounce)
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith({ q: "Lviv", city: "" });
      });
    });

    it("should not trigger debounced search after explicit search button click", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText("Search clubs...");
      fireEvent.change(searchInput, { target: { value: "Lviv" } });

      const searchButton = screen.getByText("Search");
      fireEvent.click(searchButton);

      // Should call onSearch once from button click
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      
      // Fast forward debounce timer
      jest.advanceTimersByTime(500);
      
      // Should still be just 1 call (debounce was skipped)
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Layout Stability", () => {
    it("should maintain stable button layout during typing", () => {
      const mockOnSearch = jest.fn();
      const { container } = render(<PublicSearchBar onSearch={mockOnSearch} />);

      // Get initial button container
      const buttonContainer = container.querySelector(".flex.items-center.gap-3");
      const initialChildCount = buttonContainer?.childElementCount || 0;

      // Type in search field
      const searchInput = screen.getByPlaceholderText("Search clubs...");
      fireEvent.change(searchInput, { target: { value: "L" } });
      fireEvent.change(searchInput, { target: { value: "Lv" } });
      fireEvent.change(searchInput, { target: { value: "Lvi" } });
      fireEvent.change(searchInput, { target: { value: "Lviv" } });

      // Button container should have same number of children
      const finalChildCount = buttonContainer?.childElementCount || 0;
      expect(finalChildCount).toBe(initialChildCount);
    });
  });

  describe("Focus Preservation", () => {
    it("should preserve focus on input during typing", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      const searchInput = screen.getByPlaceholderText("Search clubs...");
      searchInput.focus();
      
      // Verify input is focused
      expect(document.activeElement).toBe(searchInput);

      // Type some text
      fireEvent.change(searchInput, { target: { value: "Lviv" } });

      // Focus should still be on the input
      expect(document.activeElement).toBe(searchInput);

      // Fast forward to trigger debounced search
      jest.advanceTimersByTime(500);

      // Focus should still be on the input after search
      await waitFor(() => {
        expect(document.activeElement).toBe(searchInput);
      });
    });
  });
});
