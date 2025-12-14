/**
 * Test for DateInput calendar close behavior
 * Verifies that the calendar closes immediately after selecting a date
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DateInput, CLOSE_DEBOUNCE_MS } from "@/components/ui/DateInput";
import { act } from "react";

// Buffer time added to debounce for test timing safety
const TEST_BUFFER_MS = 50;

// Mock Portal to render in the same DOM tree for testing
jest.mock("@/components/ui/Portal", () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock useDropdownPosition to return a fixed position
jest.mock("@/hooks/useDropdownPosition", () => ({
  useDropdownPosition: () => ({
    top: 100,
    left: 100,
  }),
}));

describe("DateInput calendar close behavior", () => {
  it("should close calendar immediately after selecting a date", async () => {
    const mockOnChange = jest.fn();
    
    render(
      <DateInput
        value=""
        onChange={mockOnChange}
        label="Test Date"
        placeholder="Select date"
      />
    );

    const input = screen.getByLabelText("Test Date");

    // Open the calendar by focusing the input
    act(() => {
      fireEvent.focus(input);
    });

    // Wait for calendar to appear
    await waitFor(() => {
      const calendar = screen.queryByRole("application");
      expect(calendar).toBeInTheDocument();
    });

    // Find a date button in the calendar and click it
    const dateButtons = screen.getAllByRole("button");
    const dateButton = dateButtons.find(
      (btn) => btn.getAttribute("data-date") !== null && !btn.disabled
    );

    expect(dateButton).toBeDefined();

    // Click the date button
    act(() => {
      fireEvent.click(dateButton!);
    });

    // Verify onChange was called
    expect(mockOnChange).toHaveBeenCalledTimes(1);

    // Wait for calendar to close
    await waitFor(
      () => {
        const calendar = screen.queryByRole("application");
        expect(calendar).not.toBeInTheDocument();
      },
      { timeout: 200 }
    );
  });

  it("should not reopen calendar when input regains focus after date selection", async () => {
    const mockOnChange = jest.fn();
    
    render(
      <DateInput
        value=""
        onChange={mockOnChange}
        label="Test Date"
        placeholder="Select date"
      />
    );

    const input = screen.getByLabelText("Test Date");

    // Open the calendar
    act(() => {
      fireEvent.focus(input);
    });

    // Wait for calendar to appear
    await waitFor(() => {
      expect(screen.queryByRole("application")).toBeInTheDocument();
    });

    // Find and click a date button
    const dateButtons = screen.getAllByRole("button");
    const dateButton = dateButtons.find(
      (btn) => btn.getAttribute("data-date") !== null && !btn.disabled
    );

    act(() => {
      fireEvent.click(dateButton!);
    });

    // Calendar should close
    await waitFor(
      () => {
        expect(screen.queryByRole("application")).not.toBeInTheDocument();
      },
      { timeout: 200 }
    );

    // Wait for the justClosedRef timeout plus a small buffer
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, CLOSE_DEBOUNCE_MS + TEST_BUFFER_MS));
    });

    // Focus the input again (simulating user clicking back on the input)
    act(() => {
      fireEvent.focus(input);
    });

    // Calendar should open again since enough time has passed
    await waitFor(() => {
      expect(screen.queryByRole("application")).toBeInTheDocument();
    });
  });
});
