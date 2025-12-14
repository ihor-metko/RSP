/**
 * Test for Select dropdown positioning behavior
 * Verifies that the dropdown correctly positions itself above the input when space is insufficient below
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Select, SelectOption } from "@/components/ui/Select";
import { act } from "react";

// Mock Portal to render in the same DOM tree for testing
jest.mock("@/components/ui/Portal", () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="portal">{children}</div>,
}));

describe("Select dropdown positioning", () => {
  const mockOptions: SelectOption[] = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
    { value: "option4", label: "Option 4" },
    { value: "option5", label: "Option 5" },
  ];

  beforeEach(() => {
    // Reset viewport size
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 768,
    });
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it("should position dropdown below input when enough space is available", async () => {
    const mockOnChange = jest.fn();

    // Mock getBoundingClientRect to simulate trigger near top of viewport
    const mockGetBoundingClientRect = jest.fn(() => ({
      top: 100,
      bottom: 140,
      left: 50,
      right: 250,
      width: 200,
      height: 40,
      x: 50,
      y: 100,
      toJSON: () => {},
    }));

    render(
      <Select
        label="Test Select"
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select an option"
      />
    );

    const trigger = screen.getByRole("combobox");
    
    // Override getBoundingClientRect for the trigger
    Object.defineProperty(trigger, "getBoundingClientRect", {
      value: mockGetBoundingClientRect,
    });

    // Open the dropdown
    act(() => {
      fireEvent.click(trigger);
    });

    // Wait for dropdown to appear
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });

    const listbox = screen.getByRole("listbox");
    const style = listbox.style;
    
    // Dropdown should be positioned below the trigger (top: 140 + offset)
    expect(parseInt(style.top)).toBeGreaterThan(140);
  });

  it("should position dropdown above input when space below is insufficient", async () => {
    const mockOnChange = jest.fn();

    // Mock getBoundingClientRect to simulate trigger near bottom of viewport
    const mockGetBoundingClientRect = jest.fn(() => ({
      top: 650, // Near bottom of 768px viewport
      bottom: 690,
      left: 50,
      right: 250,
      width: 200,
      height: 40,
      x: 50,
      y: 650,
      toJSON: () => {},
    }));

    render(
      <Select
        label="Test Select Near Bottom"
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select an option"
      />
    );

    const trigger = screen.getByRole("combobox");
    
    // Override getBoundingClientRect for the trigger
    Object.defineProperty(trigger, "getBoundingClientRect", {
      value: mockGetBoundingClientRect,
    });

    // Open the dropdown
    act(() => {
      fireEvent.click(trigger);
    });

    // Wait for dropdown to appear
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });

    const listbox = screen.getByRole("listbox");
    const style = listbox.style;
    
    // Dropdown should be positioned above the trigger
    // The top position should be less than the trigger's top (650)
    expect(parseInt(style.top)).toBeLessThan(650);
  });

  it("should respect viewport padding when positioning above", async () => {
    const mockOnChange = jest.fn();
    const VIEWPORT_PADDING = 8;

    // Mock getBoundingClientRect to simulate trigger very close to top
    const mockGetBoundingClientRect = jest.fn(() => ({
      top: 50, // Close to top but with insufficient space below
      bottom: 90,
      left: 50,
      right: 250,
      width: 200,
      height: 40,
      x: 50,
      y: 50,
      toJSON: () => {},
    }));

    // Set a small viewport height to force top placement with limited space
    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 200,
    });

    render(
      <Select
        label="Test Select Near Top"
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select an option"
      />
    );

    const trigger = screen.getByRole("combobox");
    
    // Override getBoundingClientRect for the trigger
    Object.defineProperty(trigger, "getBoundingClientRect", {
      value: mockGetBoundingClientRect,
    });

    // Open the dropdown
    act(() => {
      fireEvent.click(trigger);
    });

    // Wait for dropdown to appear
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });

    const listbox = screen.getByRole("listbox");
    const style = listbox.style;
    
    // Dropdown top position should not be less than viewport padding
    expect(parseInt(style.top)).toBeGreaterThanOrEqual(VIEWPORT_PADDING);
  });

  it("should match trigger width when matchWidth is true", async () => {
    const mockOnChange = jest.fn();

    const mockGetBoundingClientRect = jest.fn(() => ({
      top: 100,
      bottom: 140,
      left: 50,
      right: 300,
      width: 250,
      height: 40,
      x: 50,
      y: 100,
      toJSON: () => {},
    }));

    render(
      <Select
        label="Test Select Width"
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select an option"
      />
    );

    const trigger = screen.getByRole("combobox");
    
    // Override getBoundingClientRect for the trigger
    Object.defineProperty(trigger, "getBoundingClientRect", {
      value: mockGetBoundingClientRect,
    });

    // Open the dropdown
    act(() => {
      fireEvent.click(trigger);
    });

    // Wait for dropdown to appear
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });

    const listbox = screen.getByRole("listbox");
    const style = listbox.style;
    
    // Dropdown width should match trigger width
    expect(style.width).toBe("250px");
  });

  it("should allow selection when dropdown is positioned above", async () => {
    const mockOnChange = jest.fn();

    const mockGetBoundingClientRect = jest.fn(() => ({
      top: 650,
      bottom: 690,
      left: 50,
      right: 250,
      width: 200,
      height: 40,
      x: 50,
      y: 650,
      toJSON: () => {},
    }));

    render(
      <Select
        label="Test Select Selection"
        options={mockOptions}
        value=""
        onChange={mockOnChange}
        placeholder="Select an option"
      />
    );

    const trigger = screen.getByRole("combobox");
    
    // Override getBoundingClientRect for the trigger
    Object.defineProperty(trigger, "getBoundingClientRect", {
      value: mockGetBoundingClientRect,
    });

    // Open the dropdown
    act(() => {
      fireEvent.click(trigger);
    });

    // Wait for dropdown to appear
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).toBeInTheDocument();
    });

    // Click an option
    const option = screen.getByText("Option 2");
    act(() => {
      fireEvent.click(option);
    });

    // Verify onChange was called with correct value
    expect(mockOnChange).toHaveBeenCalledWith("option2");

    // Dropdown should close
    await waitFor(() => {
      const listbox = screen.queryByRole("listbox");
      expect(listbox).not.toBeInTheDocument();
    });
  });
});
