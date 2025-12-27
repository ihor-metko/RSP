/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RadioGroup, RadioOption } from "@/components/ui/RadioGroup";

describe("RadioGroup Component", () => {
  const mockOptions: RadioOption[] = [
    { value: "option1", label: "Option 1", description: "First option" },
    { value: "option2", label: "Option 2", description: "Second option" },
    { value: "option3", label: "Option 3" },
  ];

  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it("renders all options correctly", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Option 1")).toBeInTheDocument();
    expect(screen.getByText("Option 2")).toBeInTheDocument();
    expect(screen.getByText("Option 3")).toBeInTheDocument();
    expect(screen.getByText("First option")).toBeInTheDocument();
    expect(screen.getByText("Second option")).toBeInTheDocument();
  });

  it("renders with a label when provided", () => {
    render(
      <RadioGroup
        label="Choose an option"
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    expect(screen.getByText("Choose an option")).toBeInTheDocument();
  });

  it("marks the correct option as selected", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option2"
        onChange={mockOnChange}
      />
    );

    const selectedOption = screen.getByRole("radio", { name: /Option 2/i });
    expect(selectedOption).toHaveAttribute("aria-checked", "true");
  });

  it("calls onChange when an option is clicked", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const option2 = screen.getByRole("radio", { name: /Option 2/i });
    fireEvent.click(option2);

    expect(mockOnChange).toHaveBeenCalledWith("option2");
  });

  it("does not call onChange when a disabled option is clicked", () => {
    const optionsWithDisabled: RadioOption[] = [
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2", disabled: true },
    ];

    render(
      <RadioGroup
        name="test-radio"
        options={optionsWithDisabled}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const disabledOption = screen.getByRole("radio", { name: /Option 2/i });
    fireEvent.click(disabledOption);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("does not call onChange when the entire group is disabled", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
        disabled
      />
    );

    const option2 = screen.getByRole("radio", { name: /Option 2/i });
    fireEvent.click(option2);

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("handles keyboard navigation with ArrowDown", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const option1 = screen.getByRole("radio", { name: /Option 1/i });
    option1.focus();
    fireEvent.keyDown(option1, { key: "ArrowDown" });

    expect(mockOnChange).toHaveBeenCalledWith("option2");
  });

  it("handles keyboard navigation with ArrowUp", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option2"
        onChange={mockOnChange}
      />
    );

    const option2 = screen.getByRole("radio", { name: /Option 2/i });
    fireEvent.keyDown(option2, { key: "ArrowUp" });

    expect(mockOnChange).toHaveBeenCalledWith("option1");
  });

  it("handles keyboard navigation wrapping from last to first", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option3"
        onChange={mockOnChange}
      />
    );

    const option3 = screen.getByRole("radio", { name: /Option 3/i });
    fireEvent.keyDown(option3, { key: "ArrowDown" });

    expect(mockOnChange).toHaveBeenCalledWith("option1");
  });

  it("handles Space key selection", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const option2 = screen.getByRole("radio", { name: /Option 2/i });
    fireEvent.keyDown(option2, { key: " " });

    expect(mockOnChange).toHaveBeenCalledWith("option2");
  });

  it("handles Enter key selection", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const option2 = screen.getByRole("radio", { name: /Option 2/i });
    fireEvent.keyDown(option2, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledWith("option2");
  });

  it("has proper ARIA attributes", () => {
    render(
      <RadioGroup
        label="Choose an option"
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const radiogroup = screen.getByRole("radiogroup");
    expect(radiogroup).toBeInTheDocument();

    const selectedOption = screen.getByRole("radio", { name: /Option 1/i });
    expect(selectedOption).toHaveAttribute("aria-checked", "true");
    expect(selectedOption).toHaveAttribute("tabIndex", "0");

    const unselectedOption = screen.getByRole("radio", { name: /Option 2/i });
    expect(unselectedOption).toHaveAttribute("aria-checked", "false");
    expect(unselectedOption).toHaveAttribute("tabIndex", "-1");
  });

  it("applies custom className", () => {
    const { container } = render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
        className="custom-class"
      />
    );

    const radioGroup = container.querySelector(".im-radio-group");
    expect(radioGroup).toHaveClass("custom-class");
  });

  it("skips disabled options during keyboard navigation", () => {
    const optionsWithDisabled: RadioOption[] = [
      { value: "option1", label: "Option 1" },
      { value: "option2", label: "Option 2", disabled: true },
      { value: "option3", label: "Option 3" },
    ];

    render(
      <RadioGroup
        name="test-radio"
        options={optionsWithDisabled}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const option1 = screen.getByRole("radio", { name: /Option 1/i });
    fireEvent.keyDown(option1, { key: "ArrowDown" });

    // Should skip option2 (disabled) and go to option3
    expect(mockOnChange).toHaveBeenCalledWith("option3");
  });

  it("associates descriptions with options using aria-describedby", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value="option1"
        onChange={mockOnChange}
      />
    );

    const option1 = screen.getByRole("radio", { name: /Option 1/i });
    expect(option1).toHaveAttribute("aria-describedby", "test-radio-option1-desc");

    const description = document.getElementById("test-radio-option1-desc");
    expect(description).toHaveTextContent("First option");
  });

  it("makes first enabled option focusable when no option is selected", () => {
    render(
      <RadioGroup
        name="test-radio"
        options={mockOptions}
        value=""
        onChange={mockOnChange}
      />
    );

    const option1 = screen.getByRole("radio", { name: /Option 1/i });
    const option2 = screen.getByRole("radio", { name: /Option 2/i });

    // First option should be focusable (tabIndex 0)
    expect(option1).toHaveAttribute("tabIndex", "0");
    // Other options should not be focusable
    expect(option2).toHaveAttribute("tabIndex", "-1");
  });
});
