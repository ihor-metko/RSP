/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
jest.mock("next/link", () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = "MockLink";
  return MockLink;
});

// Import the component
import { ClubCreationStepper } from "@/components/admin/ClubCreationStepper.client";

describe("ClubCreationStepper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the first step (General Information) by default", () => {
    render(<ClubCreationStepper />);
    
    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText(/Club Name/i)).toBeInTheDocument();
  });

  it("shows the stepper indicator with 5 steps", () => {
    render(<ClubCreationStepper />);
    
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("Courts")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
  });

  it("prevents moving to next step without required fields", () => {
    render(<ClubCreationStepper />);
    
    // Try to click Next without entering name
    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);
    
    // Should still be on step 1
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    // Should show error
    expect(screen.getByText("Club name is required")).toBeInTheDocument();
  });

  it("moves to next step when required fields are filled", () => {
    render(<ClubCreationStepper />);
    
    // Enter club name
    const nameInput = screen.getByLabelText(/Club Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Club" } });
    
    // Click Next
    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);
    
    // Should be on step 2
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    expect(screen.getByText("Contacts and Address")).toBeInTheDocument();
  });

  it("allows going back to previous step", () => {
    render(<ClubCreationStepper />);
    
    // Enter club name and move to step 2
    const nameInput = screen.getByLabelText(/Club Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Club" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    
    // Should be on step 2
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    
    // Click Back
    const backButton = screen.getByRole("button", { name: "Back" });
    fireEvent.click(backButton);
    
    // Should be back on step 1
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("preserves form data when navigating between steps", () => {
    render(<ClubCreationStepper />);
    
    // Enter club name
    const nameInput = screen.getByLabelText(/Club Name/i);
    fireEvent.change(nameInput, { target: { value: "My Test Club" } });
    
    // Move to step 2
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    
    // Go back to step 1
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    
    // Name should still be there
    expect(screen.getByLabelText(/Club Name/i)).toHaveValue("My Test Club");
  });

  it("shows Cancel button and navigates back to clubs on cancel", () => {
    render(<ClubCreationStepper />);
    
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    
    expect(mockPush).toHaveBeenCalledWith("/admin/clubs");
  });

  it("navigates through all steps", () => {
    render(<ClubCreationStepper />);
    
    // Step 1: Enter name
    const nameInput = screen.getByLabelText(/Club Name/i);
    fireEvent.change(nameInput, { target: { value: "Test Club" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    
    // Step 2: Skip to next (no required fields)
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 3 of 5")).toBeInTheDocument();
    expect(screen.getByText("Club Working Hours")).toBeInTheDocument();
    
    // Step 3: Skip to next
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 4 of 5")).toBeInTheDocument();
    // Use heading role to distinguish from stepper indicator
    expect(screen.getByRole("heading", { name: "Courts" })).toBeInTheDocument();
    
    // Step 4: Skip to next
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Step 5 of 5")).toBeInTheDocument();
    expect(screen.getByText("Gallery / Images")).toBeInTheDocument();
  });

  it("shows Create Club button on last step", () => {
    render(<ClubCreationStepper />);
    
    // Navigate through all steps
    fireEvent.change(screen.getByLabelText(/Club Name/i), { target: { value: "Test Club" } });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    
    // Should show Create Club button instead of Next
    expect(screen.getByRole("button", { name: "Create Club" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("shows breadcrumb navigation", () => {
    render(<ClubCreationStepper />);
    
    expect(screen.getByText("Clubs")).toBeInTheDocument();
    expect(screen.getByText("New Club")).toBeInTheDocument();
  });

  describe("Step 4: Courts", () => {
    beforeEach(() => {
      render(<ClubCreationStepper />);
      
      // Navigate to step 4
      fireEvent.change(screen.getByLabelText(/Club Name/i), { target: { value: "Test Club" } });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });

    it("shows Add Court button", () => {
      expect(screen.getByRole("button", { name: "+ Add Court" })).toBeInTheDocument();
    });

    it("adds a new court when clicking Add Court", () => {
      fireEvent.click(screen.getByRole("button", { name: "+ Add Court" }));
      
      expect(screen.getByText("Court 1")).toBeInTheDocument();
    });

    it("removes a court when clicking remove button", () => {
      // Add a court
      fireEvent.click(screen.getByRole("button", { name: "+ Add Court" }));
      expect(screen.getByText("Court 1")).toBeInTheDocument();
      
      // Remove the court
      fireEvent.click(screen.getByRole("button", { name: "Remove court 1" }));
      expect(screen.queryByText("Court 1")).not.toBeInTheDocument();
    });
  });
});
