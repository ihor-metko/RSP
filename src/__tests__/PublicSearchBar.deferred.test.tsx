import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { PublicSearchBar } from "@/components/PublicSearchBar";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubs.searchPlaceholder": "Search by name or address",
      "clubs.cityPlaceholder": "City",
      "common.search": "Search",
      "clubs.clearFilters": "Clear Filters",
    };
    return translations[key] || key;
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Input: ({ value, onChange, placeholder, "aria-label": ariaLabel, className }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={className}
    />
  ),
  Button: ({ children, disabled, type, onClick, className }: any) => (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  ),
}));

describe("PublicSearchBar - Deferred Value Behavior", () => {
  describe("onSearch mode with deferred values", () => {
    it("should use deferred values to prevent UI flickering", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);
      
      const nameInput = screen.getByPlaceholderText("Search by name or address");

      // Type into the input field
      fireEvent.change(nameInput, { target: { value: "Test Club" } });

      // The onSearch should be called with deferred values
      // useDeferredValue will cause a slight delay in the update
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            q: "Test Club",
            city: "",
          })
        );
      }, { timeout: 200 });
    });

    it("should call onSearch with deferred city value", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);
      
      const cityInput = screen.getByPlaceholderText("City");

      // Type into the city input field
      fireEvent.change(cityInput, { target: { value: "New York" } });

      // The onSearch should be called with deferred city value
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            q: "",
            city: "New York",
          })
        );
      }, { timeout: 200 });
    });

    it("should show typed value immediately in input (not deferred)", () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);
      
      const nameInput = screen.getByPlaceholderText("Search by name or address") as HTMLInputElement;

      // Type into the input field
      fireEvent.change(nameInput, { target: { value: "T" } });

      // The input should show the value immediately (not deferred)
      expect(nameInput.value).toBe("T");
    });

    it("should call onSearch on initial render with empty values", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);

      // Should be called once on mount with initial empty values
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith({
          q: "",
          city: "",
        });
      }, { timeout: 200 });
    });

    it("should call onSearch when both q and city change", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} />);
      
      const nameInput = screen.getByPlaceholderText("Search by name or address");
      const cityInput = screen.getByPlaceholderText("City");

      // Type into both fields
      fireEvent.change(nameInput, { target: { value: "Arena" } });
      fireEvent.change(cityInput, { target: { value: "LA" } });

      // Should eventually call onSearch with both values
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith(
          expect.objectContaining({
            q: "Arena",
            city: "LA",
          })
        );
      }, { timeout: 300 });
    });

    it("should not call onSearch when navigateOnSearch is true", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} navigateOnSearch={true} />);
      
      const nameInput = screen.getByPlaceholderText("Search by name or address");

      // Type into the input field
      fireEvent.change(nameInput, { target: { value: "Test" } });

      // Wait a bit to ensure no call happens
      await new Promise(resolve => setTimeout(resolve, 200));

      // onSearch should not be called when navigateOnSearch is true
      expect(mockOnSearch).not.toHaveBeenCalled();
    });

    it("should handle clear button correctly", async () => {
      const mockOnSearch = jest.fn();
      render(<PublicSearchBar onSearch={mockOnSearch} initialQ="Test" initialCity="NYC" />);
      
      // Wait for initial call
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalled();
      });

      mockOnSearch.mockClear();

      const clearButton = screen.getByText("Clear Filters");
      fireEvent.click(clearButton);

      // Should call onSearch with empty values
      await waitFor(() => {
        expect(mockOnSearch).toHaveBeenCalledWith({
          q: "",
          city: "",
        });
      }, { timeout: 200 });
    });
  });
});
