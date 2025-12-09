/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdminOrganizationCard } from "@/components/admin/AdminOrganizationCard";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

describe("AdminOrganizationCard", () => {
  const mockOrganization = {
    id: "org-1",
    name: "Test Organization",
    slug: "test-organization",
    createdAt: "2024-01-15T00:00:00.000Z",
    clubCount: 5,
    superAdmins: [
      {
        id: "user-1",
        name: "John Doe",
        email: "john@example.com",
        isPrimaryOwner: true,
      },
      {
        id: "user-2",
        name: "Jane Smith",
        email: "jane@example.com",
        isPrimaryOwner: false,
      },
    ],
  };

  it("should render organization name and slug", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.getByText("Test Organization")).toBeInTheDocument();
    expect(screen.getByText("test-organization")).toBeInTheDocument();
  });

  it("should show active status when clubCount > 0", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.getByText("organizations.active")).toBeInTheDocument();
  });

  it("should show inactive status when clubCount is 0", () => {
    const orgWithNoClubs = { ...mockOrganization, clubCount: 0 };
    render(<AdminOrganizationCard organization={orgWithNoClubs} />);
    
    expect(screen.getByText("organizations.inactive")).toBeInTheDocument();
  });

  it("should display primary owner information", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("should show metadata (clubs count, admins count)", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    // Check for clubs count - looking for text that contains both the count and the label
    expect(screen.getByText(/5.*admin\.clubs|admin\.clubs.*5/)).toBeInTheDocument();
    
    // Check for admins count
    expect(screen.getByText(/2.*organizations\.superAdmins|organizations\.superAdmins.*2/)).toBeInTheDocument();
  });

  it("should render View button when onView callback is provided", () => {
    const onView = jest.fn();
    render(
      <AdminOrganizationCard organization={mockOrganization} onView={onView} />
    );
    
    expect(screen.getByText("organizations.viewDetails")).toBeInTheDocument();
  });

  it("should not render Edit button - removed per requirements", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.queryByText("common.edit")).not.toBeInTheDocument();
  });

  it("should not render Delete button - removed per requirements", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.queryByText("common.delete")).not.toBeInTheDocument();
  });

  it("should not render Manage Admins button - removed per requirements", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.queryByText("organizations.manageAdmins")).not.toBeInTheDocument();
  });

  it("should not render Add Admin button - removed per requirements", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.queryByText("organizations.addAdmin")).not.toBeInTheDocument();
  });

  it("should show not assigned message when no superAdmins exist", () => {
    const orgWithNoAdmins = { ...mockOrganization, superAdmins: [] };
    render(<AdminOrganizationCard organization={orgWithNoAdmins} />);
    
    expect(screen.getByText("organizations.notAssigned")).toBeInTheDocument();
  });

  it("should make organization name clickable when onView is provided", () => {
    const onView = jest.fn();
    render(
      <AdminOrganizationCard organization={mockOrganization} onView={onView} />
    );
    
    // Find the organization name button (should contain the organization name)
    const nameButtons = screen.getAllByRole("button", { name: /organizations\.viewDetails/i });
    const nameButton = nameButtons.find(btn => btn.textContent === "Test Organization");
    expect(nameButton).toBeInTheDocument();
    expect(nameButton).toHaveTextContent("Test Organization");
  });

  it("should render organization name as plain text when onView is not provided", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    // The name should still be present but not as a button
    expect(screen.getByText("Test Organization")).toBeInTheDocument();
    // Should not have a clickable element with aria-label
    expect(screen.queryByRole("button", { name: /organizations\.viewDetails/i })).not.toBeInTheDocument();
  });
});
