/**
 * Test for DateInput calendar behavior when clicking input vs icon
 * Verifies that date selection works whether calendar is opened via input click or icon click
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { DateInput } from "@/components/ui/DateInput";
import { act } from "react";

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

describe("DateInput calendar click behavior", () => {
  it("should allow date selection after opening calendar via input focus", async () => {
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

    // Open the calendar by focusing on the input (simulating user clicking on input)
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

    // Verify onChange was called with a date
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should allow date selection after opening calendar via icon click", async () => {
    const mockOnChange = jest.fn();
    
    render(
      <DateInput
        value=""
        onChange={mockOnChange}
        label="Test Date"
        placeholder="Select date"
      />
    );

    // Find the calendar icon button
    const iconButton = screen.getByLabelText("Open calendar");

    // Open the calendar by clicking the icon
    act(() => {
      fireEvent.click(iconButton);
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

    // Verify onChange was called with a date
    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("should apply the selected date value to the input", async () => {
    const mockOnChange = jest.fn();
    
    const { rerender } = render(
      <DateInput
        value=""
        onChange={mockOnChange}
        label="Test Date"
        placeholder="Select date"
      />
    );

    const input = screen.getByLabelText("Test Date");

    // Open the calendar by focusing on the input (simulating user clicking on input)
    act(() => {
      fireEvent.focus(input);
    });

    // Wait for calendar to appear
    await waitFor(() => {
      expect(screen.queryByRole("application")).toBeInTheDocument();
    });

    // Find a date button and click it
    const dateButtons = screen.getAllByRole("button");
    const dateButton = dateButtons.find(
      (btn) => btn.getAttribute("data-date") !== null && !btn.disabled
    );

    act(() => {
      fireEvent.click(dateButton!);
    });

    // Get the selected date
    const selectedDate = mockOnChange.mock.calls[0][0];

    // Rerender with the selected value
    rerender(
      <DateInput
        value={selectedDate}
        onChange={mockOnChange}
        label="Test Date"
        placeholder="Select date"
      />
    );

    // Verify the input displays the formatted date
    const updatedInput = screen.getByLabelText("Test Date") as HTMLInputElement;
    expect(updatedInput.value).not.toBe("");
    expect(updatedInput.value).toBeTruthy();
  });
});
