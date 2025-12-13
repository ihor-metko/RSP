import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Select } from "@/components/ui/Select";
import { useState } from "react";

// Mock Portal to render in the same container
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

function TestSelectComponent() {
  const [value, setValue] = useState("");

  return (
    <div>
      <Select
        options={[
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
          { value: "option3", label: "Option 3" },
        ]}
        value={value}
        onChange={setValue}
        placeholder="Select an option"
        label="Test Select"
      />
      <div data-testid="selected-value">{value || "none"}</div>
    </div>
  );
}

describe("Select Component Value Binding", () => {
  it("should display placeholder when no value is selected", () => {
    render(<TestSelectComponent />);
    expect(screen.getByText("Select an option")).toBeInTheDocument();
    expect(screen.getByTestId("selected-value")).toHaveTextContent("none");
  });

  it("should update value when an option is selected", async () => {
    render(<TestSelectComponent />);

    // Open dropdown
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // Click an option
    const option = screen.getByRole("option", { name: "Option 2" });
    fireEvent.click(option);

    // Verify value updated
    await waitFor(() => {
      expect(screen.getByTestId("selected-value")).toHaveTextContent("option2");
    });

    // Verify dropdown closed
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    // Verify selected option is displayed
    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("should update displayed value when prop changes", () => {
    const { rerender } = render(
      <Select
        options={[
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ]}
        value="option1"
        onChange={() => {}}
        placeholder="Select"
      />
    );

    expect(screen.getByText("Option 1")).toBeInTheDocument();

    rerender(
      <Select
        options={[
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ]}
        value="option2"
        onChange={() => {}}
        placeholder="Select"
      />
    );

    expect(screen.getByText("Option 2")).toBeInTheDocument();
  });

  it("should call onChange with the correct value", async () => {
    const mockOnChange = jest.fn();
    render(
      <Select
        options={[
          { value: "option1", label: "Option 1" },
          { value: "option2", label: "Option 2" },
        ]}
        value=""
        onChange={mockOnChange}
        placeholder="Select"
      />
    );

    // Open dropdown
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    // Wait for dropdown to open
    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    // Click an option
    const option = screen.getByRole("option", { name: "Option 1" });
    fireEvent.click(option);

    // Verify onChange was called with correct value
    expect(mockOnChange).toHaveBeenCalledWith("option1");
  });
});
