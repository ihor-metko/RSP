/**
 * @jest-environment jsdom
 */

import React, { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Select, type SelectOption } from "@/components/ui/Select";

// Mock Portal component
jest.mock("@/components/ui/Portal", () => ({
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock useDropdownPosition hook
jest.mock("@/hooks/useDropdownPosition", () => ({
  useDropdownPosition: () => ({
    top: 100,
    left: 100,
    width: 200,
    maxHeight: 300,
  }),
}));

describe("Select Component", () => {
  const mockOptions: SelectOption[] = [
    { value: "option1", label: "Option 1" },
    { value: "option2", label: "Option 2" },
    { value: "option3", label: "Option 3" },
  ];

  it("should display the selected value when controlled", () => {
    const { rerender } = render(
      <Select
        options={mockOptions}
        value="option1"
        onChange={() => {}}
        placeholder="Select an option"
      />
    );

    // Should show "Option 1" as the selected value
    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.queryByText("Select an option")).not.toBeInTheDocument();

    // Change value
    rerender(
      <Select
        options={mockOptions}
        value="option2"
        onChange={() => {}}
        placeholder="Select an option"
      />
    );

    // Should now show "Option 2"
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.queryByText("Option 1")).not.toBeInTheDocument();
  });

  it("should display placeholder when no value is selected", () => {
    render(
      <Select
        options={mockOptions}
        value={undefined}
        onChange={() => {}}
        placeholder="Select an option"
      />
    );

    expect(screen.getByText("Select an option")).toBeInTheDocument();
  });

  it("should update displayed value after selection", () => {
    function ControlledSelect() {
      const [value, setValue] = useState<string>("");

      return (
        <Select
          options={mockOptions}
          value={value}
          onChange={setValue}
          placeholder="Select an option"
        />
      );
    }

    render(<ControlledSelect />);

    // Initially shows placeholder
    expect(screen.getByText("Select an option")).toBeInTheDocument();

    // Open the dropdown
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Click on "Option 2"
    const option2 = screen.getByText("Option 2");
    fireEvent.click(option2);

    // Should now display the selected value
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.queryByText("Select an option")).not.toBeInTheDocument();
  });

  it("should show selected value with icon", () => {
    const optionsWithIcons: SelectOption[] = [
      { value: "opt1", label: "First", icon: <span>🔥</span> },
      { value: "opt2", label: "Second", icon: <span>⚡</span> },
    ];

    render(
      <Select
        options={optionsWithIcons}
        value="opt1"
        onChange={() => {}}
      />
    );

    expect(screen.getByText("First")).toBeInTheDocument();
    expect(screen.getByText("🔥")).toBeInTheDocument();
  });
});
