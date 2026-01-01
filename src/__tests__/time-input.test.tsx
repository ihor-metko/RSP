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

  describe("Keyboard Navigation", () => {
    it("increments hours when Up arrow is pressed with cursor in hours section", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(0, 0); // Position cursor at start (hours section)
      fireEvent.keyDown(input, { key: "ArrowUp" });
      
      await waitFor(() => {
        expect(input).toHaveValue("10:30");
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it("decrements hours when Down arrow is pressed with cursor in hours section", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(1, 1); // Position cursor in hours section
      fireEvent.keyDown(input, { key: "ArrowDown" });
      
      await waitFor(() => {
        expect(input).toHaveValue("08:30");
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it("increments minutes when Up arrow is pressed with cursor in minutes section", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(3, 3); // Position cursor in minutes section
      fireEvent.keyDown(input, { key: "ArrowUp" });
      
      await waitFor(() => {
        expect(input).toHaveValue("09:31");
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it("decrements minutes when Down arrow is pressed with cursor in minutes section", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(4, 4); // Position cursor in minutes section
      fireEvent.keyDown(input, { key: "ArrowDown" });
      
      await waitFor(() => {
        expect(input).toHaveValue("09:29");
      });
      expect(handleChange).toHaveBeenCalled();
    });

    it("wraps hours from 23 to 00 when incrementing", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="23:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(0, 0);
      fireEvent.keyDown(input, { key: "ArrowUp" });
      
      await waitFor(() => {
        expect(input).toHaveValue("00:30");
      });
    });

    it("wraps hours from 00 to 23 when decrementing", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="00:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(0, 0);
      fireEvent.keyDown(input, { key: "ArrowDown" });
      
      await waitFor(() => {
        expect(input).toHaveValue("23:30");
      });
    });

    it("wraps minutes from 59 to 00 when incrementing", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:59" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(3, 3);
      fireEvent.keyDown(input, { key: "ArrowUp" });
      
      await waitFor(() => {
        expect(input).toHaveValue("09:00");
      });
    });

    it("wraps minutes from 00 to 59 when decrementing", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:00" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(3, 3);
      fireEvent.keyDown(input, { key: "ArrowDown" });
      
      await waitFor(() => {
        expect(input).toHaveValue("09:59");
      });
    });

    it("handles empty value with Up arrow key", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox") as HTMLInputElement;
      input.setSelectionRange(0, 0);
      fireEvent.keyDown(input, { key: "ArrowUp" });
      
      await waitFor(() => {
        expect(input).toHaveValue("10:00");
      });
    });
  });

  describe("Dropdown Behavior", () => {
    it("opens dropdown when input is focused", async () => {
      render(<TimeInput value="09:30" label="Start Time" />);
      
      const input = screen.getByRole("combobox");
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(input).toHaveAttribute("aria-expanded", "true");
      });
    });

    it("clicking on an hour only selects it without applying", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox");
      fireEvent.focus(input);
      
      // Wait for dropdown to appear
      await waitFor(() => {
        expect(screen.getByText("Select Time")).toBeInTheDocument();
      });
      
      // Click on a different hour (e.g., 14) - Get all buttons and find the one in hours column
      const allButtons = screen.getAllByRole("button");
      const hourButton = allButtons.find(btn => btn.textContent === "14" && btn.className.includes("im-time-option"));
      expect(hourButton).toBeDefined();
      fireEvent.click(hourButton!);
      
      // onChange should NOT have been called yet (time not applied)
      expect(handleChange).not.toHaveBeenCalled();
      // Input value should still be the original
      expect(input).toHaveValue("09:30");
    });

    it("clicking on a minute only selects it without applying", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox");
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByText("Select Time")).toBeInTheDocument();
      });
      
      // Click on a different minute (e.g., 45)
      const allButtons = screen.getAllByRole("button");
      const minuteButton = allButtons.find(btn => btn.textContent === "45" && btn.className.includes("im-time-option"));
      expect(minuteButton).toBeDefined();
      fireEvent.click(minuteButton!);
      
      // onChange should NOT have been called yet
      expect(handleChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("09:30");
    });

    it("applies time when Confirm button is clicked", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox");
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByText("Select Time")).toBeInTheDocument();
      });
      
      const allButtons = screen.getAllByRole("button");
      
      // Click on hour 14
      const hourButton = allButtons.find(btn => btn.textContent === "14" && btn.className.includes("im-time-option"));
      expect(hourButton).toBeDefined();
      fireEvent.click(hourButton!);
      
      // Click on minute 45
      const minuteButton = allButtons.find(btn => btn.textContent === "45" && btn.className.includes("im-time-option"));
      expect(minuteButton).toBeDefined();
      fireEvent.click(minuteButton!);
      
      // Click Confirm button
      const confirmButton = screen.getByRole("button", { name: "Confirm" });
      fireEvent.click(confirmButton);
      
      // NOW onChange should be called with the new time
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        expect(input).toHaveValue("14:45");
      });
    });

    it("applies time when clicking outside dropdown", async () => {
      const handleChange = jest.fn();
      render(
        <div>
          <TimeInput value="09:30" onChange={handleChange} label="Start Time" />
          <div data-testid="outside">Outside</div>
        </div>
      );
      
      const input = screen.getByRole("combobox");
      fireEvent.focus(input);
      
      await waitFor(() => {
        expect(screen.getByText("Select Time")).toBeInTheDocument();
      });
      
      const allButtons = screen.getAllByRole("button");
      
      // Click on hour 14
      const hourButton = allButtons.find(btn => btn.textContent === "14" && btn.className.includes("im-time-option"));
      expect(hourButton).toBeDefined();
      fireEvent.click(hourButton!);
      
      // Click on minute 45
      const minuteButton = allButtons.find(btn => btn.textContent === "45" && btn.className.includes("im-time-option"));
      expect(minuteButton).toBeDefined();
      fireEvent.click(minuteButton!);
      
      // Click outside
      const outsideElement = screen.getByTestId("outside");
      fireEvent.mouseDown(outsideElement);
      
      // Time should be applied
      await waitFor(() => {
        expect(handleChange).toHaveBeenCalled();
        expect(input).toHaveValue("14:45");
      });
    });

    it("does not apply pending changes when dropdown is closed without confirm", async () => {
      const handleChange = jest.fn();
      render(<TimeInput value="09:30" onChange={handleChange} label="Start Time" />);
      
      const input = screen.getByRole("combobox");
      fireEvent.focus(input);
      
      // Wait for dropdown to be fully open
      await waitFor(() => {
        expect(input).toHaveAttribute("aria-expanded", "true");
        expect(screen.getByText("Select Time")).toBeInTheDocument();
      });
      
      const allButtons = screen.getAllByRole("button");
      
      // Click on a different hour (pending change)
      const hourButton = allButtons.find(btn => btn.textContent === "14" && btn.className.includes("im-time-option"));
      expect(hourButton).toBeDefined();
      fireEvent.click(hourButton!);
      
      // Verify selection was made but not applied
      expect(hourButton).toHaveClass("im-time-option-selected");
      expect(input).toHaveValue("09:30"); // Still the original value
      expect(handleChange).not.toHaveBeenCalled();
    });
  });
});
