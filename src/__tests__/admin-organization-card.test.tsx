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

  it("should render Edit button when canEdit is true and onEdit callback is provided", () => {
    const onEdit = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={mockOrganization} 
        canEdit={true}
        onEdit={onEdit} 
      />
    );
    
    expect(screen.getByText("common.edit")).toBeInTheDocument();
  });

  it("should not render Edit button when canEdit is false", () => {
    const onEdit = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={mockOrganization} 
        canEdit={false}
        onEdit={onEdit} 
      />
    );
    
    expect(screen.queryByText("common.edit")).not.toBeInTheDocument();
  });

  it("should render Delete button when canDelete is true and onDelete callback is provided", () => {
    const onDelete = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={mockOrganization} 
        canDelete={true}
        onDelete={onDelete} 
      />
    );
    
    expect(screen.getByText("common.delete")).toBeInTheDocument();
  });

  it("should disable Delete button when organization has clubs", () => {
    const onDelete = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={mockOrganization} 
        canDelete={true}
        onDelete={onDelete} 
      />
    );
    
    const deleteButton = screen.getByText("common.delete").closest("button");
    expect(deleteButton).toBeDisabled();
  });

  it("should enable Delete button when organization has no clubs", () => {
    const orgWithNoClubs = { ...mockOrganization, clubCount: 0 };
    const onDelete = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={orgWithNoClubs} 
        canDelete={true}
        onDelete={onDelete} 
      />
    );
    
    const deleteButton = screen.getByText("common.delete").closest("button");
    expect(deleteButton).not.toBeDisabled();
  });

  it("should render Manage Admins button when canManageAdmins is true and superAdmins exist", () => {
    const onManageAdmins = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={mockOrganization} 
        canManageAdmins={true}
        onManageAdmins={onManageAdmins} 
      />
    );
    
    expect(screen.getByText("organizations.manageAdmins")).toBeInTheDocument();
  });

  it("should not render Manage Admins button when no superAdmins exist", () => {
    const orgWithNoAdmins = { ...mockOrganization, superAdmins: [] };
    const onManageAdmins = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={orgWithNoAdmins} 
        canManageAdmins={true}
        onManageAdmins={onManageAdmins} 
      />
    );
    
    expect(screen.queryByText("organizations.manageAdmins")).not.toBeInTheDocument();
  });

  it("should render Add Admin button when canEdit is true and onAddAdmin callback is provided", () => {
    const onAddAdmin = jest.fn();
    render(
      <AdminOrganizationCard 
        organization={mockOrganization} 
        canEdit={true}
        onAddAdmin={onAddAdmin} 
      />
    );
    
    expect(screen.getByText("organizations.addAdmin")).toBeInTheDocument();
  });

  it("should show not assigned message when no superAdmins exist", () => {
    const orgWithNoAdmins = { ...mockOrganization, superAdmins: [] };
    render(<AdminOrganizationCard organization={orgWithNoAdmins} />);
    
    expect(screen.getByText("organizations.notAssigned")).toBeInTheDocument();
  });
});
