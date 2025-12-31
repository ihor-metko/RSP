import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { TimeInput } from "@/components/ui/TimeInput";

describe("TimeInput", () => {
  it("renders with label", () => {
    render(<TimeInput label="Start Time" />);
    expect(screen.getByText("Start Time")).toBeInTheDocument();
  });

  it("displays the provided time value", () => {
    render(<TimeInput value="14:30" label="Start Time" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveValue("14:30");
  });

  it("calls onChange when value changes", async () => {
    const handleChange = jest.fn();
    render(<TimeInput value="09:00" onChange={handleChange} label="Start Time" />);
    
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "10:30" } });
    
    // The component formats on blur
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });
  });

  it("formats incomplete time input on blur", async () => {
    const handleChange = jest.fn();
    render(<TimeInput onChange={handleChange} label="Start Time" />);
    
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "9:5" } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(input).toHaveValue("09:05");
    });
  });

  it("accepts HH:MM format input", async () => {
    const handleChange = jest.fn();
    render(<TimeInput onChange={handleChange} label="Start Time" />);
    
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "15:45" } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(input).toHaveValue("15:45");
    });
  });

  it("can be disabled", () => {
    render(<TimeInput disabled label="Start Time" />);
    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();
  });

  it("has proper ARIA attributes", () => {
    render(<TimeInput label="Start Time" aria-label="Select start time" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-label", "Select start time");
    expect(input).toHaveAttribute("aria-haspopup", "dialog");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("accepts placeholder text", () => {
    render(<TimeInput placeholder="Select time" label="Start Time" />);
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("placeholder", "Select time");
  });
});
