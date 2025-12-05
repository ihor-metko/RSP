/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

// Mock fetch for admin status and organizations
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Import the component
import { ClubCreationStepper } from "@/components/admin/ClubCreationStepper.client";

describe("ClubCreationStepper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for root admin with organizations
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/me/admin-status") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            isAdmin: true,
            adminType: "root_admin",
            isRoot: true,
            managedIds: [],
          }),
        });
      }
      if (url.includes("/api/admin/organizations/search")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: "org-1", name: "Test Organization", slug: "test-org" },
            { id: "org-2", name: "Another Organization", slug: "another-org" },
          ]),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  it("renders the first step (General Information) by default", async () => {
    render(<ClubCreationStepper />);
    
    expect(screen.getByText("General Information")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    expect(screen.getByLabelText(/Club Name/i)).toBeInTheDocument();
  });

  it("shows the stepper indicator with 5 steps", async () => {
    render(<ClubCreationStepper />);
    
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Contacts")).toBeInTheDocument();
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByText("Courts")).toBeInTheDocument();
    expect(screen.getByText("Gallery")).toBeInTheDocument();
  });

  it("prevents moving to next step without required fields", async () => {
    render(<ClubCreationStepper />);
    
    // Wait for admin status to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/me/admin-status");
    });

    // Clear the name input (it has a default value)
    const nameInput = screen.getByLabelText(/Club Name/i);
    fireEvent.change(nameInput, { target: { value: "" } });
    
    // Try to click Next without entering name
    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);
    
    // Should still be on step 1
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
    // Should show error for organization (required field)
    expect(screen.getByText("Organization is required")).toBeInTheDocument();
  });

  it("moves to next step when required fields are filled", async () => {
    render(<ClubCreationStepper />);
    
    // Wait for admin status and organizations to load
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/me/admin-status");
    });
    
    // Wait for organization dropdown to appear
    await waitFor(() => {
      expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
    });

    // Select an organization by clicking on the dropdown and selecting an option
    const orgInput = screen.getByTestId("organization-search-input");
    fireEvent.focus(orgInput);
    
    await waitFor(() => {
      expect(screen.getByTestId("organization-dropdown")).toBeInTheDocument();
    });
    
    // Click on the first organization
    fireEvent.click(screen.getByTestId("org-option-org-1"));
    
    // Enter club name (already has default value, just verify)
    const nameInput = screen.getByLabelText(/Club Name/i);
    expect(nameInput).toHaveValue("Padel Pulse Arena");
    
    // Click Next
    const nextButton = screen.getByRole("button", { name: "Next" });
    fireEvent.click(nextButton);
    
    // Should be on step 2
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    });
    expect(screen.getByText("Contacts and Address")).toBeInTheDocument();
  });

  it("allows going back to previous step", async () => {
    render(<ClubCreationStepper />);
    
    // Wait for admin status to load and select organization
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/me/admin-status");
    });
    
    await waitFor(() => {
      expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
    });

    // Select an organization
    const orgInput = screen.getByTestId("organization-search-input");
    fireEvent.focus(orgInput);
    await waitFor(() => {
      expect(screen.getByTestId("organization-dropdown")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("org-option-org-1"));
    
    // Move to step 2
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    
    // Should be on step 2
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    });
    
    // Click Back
    const backButton = screen.getByRole("button", { name: "Back" });
    fireEvent.click(backButton);
    
    // Should be back on step 1
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });

  it("preserves form data when navigating between steps", async () => {
    render(<ClubCreationStepper />);
    
    // Wait for admin status to load
    await waitFor(() => {
      expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
    });

    // Select an organization
    const orgInput = screen.getByTestId("organization-search-input");
    fireEvent.focus(orgInput);
    await waitFor(() => {
      expect(screen.getByTestId("organization-dropdown")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("org-option-org-1"));
    
    // Change club name
    const nameInput = screen.getByLabelText(/Club Name/i);
    fireEvent.change(nameInput, { target: { value: "My Test Club" } });
    
    // Move to step 2
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    });
    
    // Go back to step 1
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    
    // Name should still be there
    expect(screen.getByLabelText(/Club Name/i)).toHaveValue("My Test Club");
  });

  it("shows Cancel button and navigates back to clubs on cancel", async () => {
    render(<ClubCreationStepper />);
    
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    
    expect(mockPush).toHaveBeenCalledWith("/admin/clubs");
  });

  it("navigates through all steps", async () => {
    render(<ClubCreationStepper />);
    
    // Wait for admin status to load and select organization
    await waitFor(() => {
      expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
    });

    // Select an organization
    const orgInput = screen.getByTestId("organization-search-input");
    fireEvent.focus(orgInput);
    await waitFor(() => {
      expect(screen.getByTestId("organization-dropdown")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("org-option-org-1"));
    
    // Step 1: Click Next (name is already filled)
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    });
    
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

  it("shows Create Club button on last step", async () => {
    render(<ClubCreationStepper />);
    
    // Wait for admin status to load and select organization
    await waitFor(() => {
      expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
    });

    // Select an organization
    const orgInput = screen.getByTestId("organization-search-input");
    fireEvent.focus(orgInput);
    await waitFor(() => {
      expect(screen.getByTestId("organization-dropdown")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("org-option-org-1"));
    
    // Navigate through all steps
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    
    // Should show Create Club button instead of Next
    expect(screen.getByRole("button", { name: "Create Club" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  describe("Step 4: Courts", () => {
    beforeEach(async () => {
      render(<ClubCreationStepper />);
      
      // Wait for admin status to load and select organization
      await waitFor(() => {
        expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
      });

      // Select an organization
      const orgInput = screen.getByTestId("organization-search-input");
      fireEvent.focus(orgInput);
      await waitFor(() => {
        expect(screen.getByTestId("organization-dropdown")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId("org-option-org-1"));
      
      // Navigate to step 4
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => {
        expect(screen.getByText("Step 2 of 5")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      fireEvent.click(screen.getByRole("button", { name: "Next" }));
    });

    it("shows Add Court button", async () => {
      expect(screen.getByRole("button", { name: "+ Add Court" })).toBeInTheDocument();
    });

    it("adds a new court when clicking Add Court", async () => {
      fireEvent.click(screen.getByRole("button", { name: "+ Add Court" }));
      
      expect(screen.getByText("Court 1")).toBeInTheDocument();
    });

    it("removes a court when clicking remove button", async () => {
      // Add a court
      fireEvent.click(screen.getByRole("button", { name: "+ Add Court" }));
      expect(screen.getByText("Court 1")).toBeInTheDocument();
      
      // Remove the court
      fireEvent.click(screen.getByRole("button", { name: "Remove court 1" }));
      expect(screen.queryByText("Court 1")).not.toBeInTheDocument();
    });
  });

  describe("Organization context for different admin types", () => {
    it("shows searchable organization dropdown for root admin", async () => {
      render(<ClubCreationStepper />);
      
      // Wait for admin status to load
      await waitFor(() => {
        expect(screen.getByTestId("organization-search-input")).toBeInTheDocument();
      });
      
      // Root admin should see searchable dropdown
      const orgInput = screen.getByTestId("organization-search-input");
      expect(orgInput).not.toBeDisabled();
    });

    it("shows disabled organization field for organization admin", async () => {
      // Mock as organization admin
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/me/admin-status") {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              isAdmin: true,
              adminType: "organization_admin",
              isRoot: false,
              managedIds: ["org-1"],
            }),
          });
        }
        if (url.includes("/api/admin/organizations/search")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: "org-1", name: "My Organization", slug: "my-org" },
            ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      
      render(<ClubCreationStepper />);
      
      // Wait for admin status to load
      await waitFor(() => {
        expect(screen.getByTestId("organization-input")).toBeInTheDocument();
      });
      
      // Organization admin should see disabled field
      const orgInput = screen.getByTestId("organization-input");
      expect(orgInput).toBeDisabled();
    });
  });
});
