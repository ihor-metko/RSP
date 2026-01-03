/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
describe("Club Search Debouncing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
  it("should debounce search input and not trigger multiple requests", async () => {
    const mockOnSearch = jest.fn();
    render(<PublicSearchBar onSearch={mockOnSearch} />);
    const searchInput = screen.getByPlaceholderText("Search clubs...");
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: "L" } });
    fireEvent.change(searchInput, { target: { value: "Lv" } });
    fireEvent.change(searchInput, { target: { value: "Lvi" } });
    fireEvent.change(searchInput, { target: { value: "Lviv" } });
    // Should not have called onSearch yet (debouncing)
    expect(mockOnSearch).not.toHaveBeenCalled();
    // Fast forward 500ms (debounce delay) and run all timers
    jest.advanceTimersByTime(500);
    // Should have called onSearch exactly once with the final value
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith({ q: "Lviv", city: "" });
  });
  it("should handle Cyrillic input correctly", async () => {
    const mockOnSearch = jest.fn();
    render(<PublicSearchBar onSearch={mockOnSearch} />);
    const searchInput = screen.getByPlaceholderText("Search clubs...");
    // Type Cyrillic characters
    fireEvent.change(searchInput, { target: { value: "Львів" } });
    // Fast forward debounce delay
    jest.advanceTimersByTime(500);
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith({ q: "Львів", city: "" });
  });
  it("should trim whitespace from search inputs", async () => {
    const mockOnSearch = jest.fn();
    render(<PublicSearchBar onSearch={mockOnSearch} />);
    const searchInput = screen.getByPlaceholderText("Search clubs...");
    const cityInput = screen.getByPlaceholderText("City");
    // Type with leading/trailing spaces
    fireEvent.change(searchInput, { target: { value: "  Lviv  " } });
    fireEvent.change(cityInput, { target: { value: "  Kyiv  " } });
    // Fast forward debounce delay
    jest.advanceTimersByTime(500);
    expect(mockOnSearch).toHaveBeenCalled();
    // Should trim the whitespace
    const lastCall = mockOnSearch.mock.calls[mockOnSearch.mock.calls.length - 1][0];
    expect(lastCall.q).toBe("Lviv");
    expect(lastCall.city).toBe("Kyiv");
  });
  it("should not trigger search when syncing from URL", async () => {
    const mockOnSearch = jest.fn();
    const { rerender } = render(<PublicSearchBar initialQ="" initialCity="" onSearch={mockOnSearch} />);
    // Simulate URL change (e.g., from back/forward navigation)
    rerender(<PublicSearchBar initialQ="Lviv" initialCity="Kyiv" onSearch={mockOnSearch} />);
    // Fast forward debounce delay
    jest.advanceTimersByTime(500);
    // Should not trigger search because we're syncing from URL
    await waitFor(() => {
      expect(mockOnSearch).not.toHaveBeenCalled();
    }, { timeout: 100 });
  });
  it("should clear filters and trigger single search", async () => {
    const mockOnSearch = jest.fn();
    render(<PublicSearchBar initialQ="test" initialCity="Kyiv" onSearch={mockOnSearch} />);
    // Wait for initial debounced search to complete
    jest.advanceTimersByTime(500);
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith({ q: "test", city: "Kyiv" });
    // Clear mock to track only the clear action
    mockOnSearch.mockClear();
    // Clear should be visible since we have filters
    const clearButton = screen.getByText("Clear filters");
    // Click clear button
    fireEvent.click(clearButton);
    // Should call onSearch immediately with empty values
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith({ q: "", city: "" });
    });
    // Fast forward to ensure no additional calls from debounce
    jest.advanceTimersByTime(500);
    // Should still be just 1 call (the clear action)
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
  });
  it("should cancel previous debounce when typing continues", async () => {
    const mockOnSearch = jest.fn();
    render(<PublicSearchBar onSearch={mockOnSearch} />);
    const searchInput = screen.getByPlaceholderText("Search clubs...");
    // Type first value
    fireEvent.change(searchInput, { target: { value: "Lv" } });
    // Wait 300ms (less than debounce delay)
    jest.advanceTimersByTime(300);
    // Type more before debounce completes
    fireEvent.change(searchInput, { target: { value: "Lviv" } });
    // Should not have called yet
    expect(mockOnSearch).not.toHaveBeenCalled();
    // Complete the debounce delay
    jest.advanceTimersByTime(500);
    // Should have called once with final value
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
      expect(mockOnSearch).toHaveBeenCalledWith({ q: "Lviv", city: "" });
    });
  });
  it("should handle empty input correctly", async () => {
    const mockOnSearch = jest.fn();
    render(<PublicSearchBar initialQ="test" onSearch={mockOnSearch} />);
    const searchInput = screen.getByPlaceholderText("Search clubs...");
    // Clear the input
    fireEvent.change(searchInput, { target: { value: "" } });
    // Fast forward debounce delay
    jest.advanceTimersByTime(500);
    // Should call with empty string
    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith({ q: "", city: "" });
  });
});
