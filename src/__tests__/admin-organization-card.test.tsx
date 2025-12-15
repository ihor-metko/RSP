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

// Mock image utilities
jest.mock("@/utils/image", () => ({
  isValidImageUrl: jest.fn((url) => url && url.startsWith("http")),
  getSupabaseStorageUrl: jest.fn((path) => path ? `https://example.supabase.co/storage/v1/object/public/uploads/${path}` : null),
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

  it("should render organization name", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.getByText("Test Organization")).toBeInTheDocument();
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

  it("should show metadata (clubs count)", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    // Check for clubs count - looking for text that contains both the count and the label
    expect(screen.getByText(/5.*admin\.clubs|admin\.clubs.*5/)).toBeInTheDocument();
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

  it("should display description when provided", () => {
    const orgWithDescription = {
      ...mockOrganization,
      description: "Test organization description",
    };
    render(<AdminOrganizationCard organization={orgWithDescription} />);
    
    expect(screen.getByText("Test organization description")).toBeInTheDocument();
  });

  it("should display no description placeholder when description is not provided", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.getByText("organizations.noDescription")).toBeInTheDocument();
  });

  it("should display heroImage when provided", () => {
    const orgWithHeroImage = {
      ...mockOrganization,
      heroImage: "organizations/org-hero.jpg",
    };
    render(<AdminOrganizationCard organization={orgWithHeroImage} />);
    
    const image = screen.getByAltText("Hero image for Test Organization");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", expect.stringContaining("organizations/org-hero.jpg"));
  });

  it("should display logo when heroImage is not provided", () => {
    const orgWithLogo = {
      ...mockOrganization,
      logo: "organizations/org-logo.png",
    };
    render(<AdminOrganizationCard organization={orgWithLogo} />);
    
    const image = screen.getByAltText("Logo for Test Organization");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", expect.stringContaining("organizations/org-logo.png"));
  });

  it("should display placeholder with first letter when no images provided", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    const placeholder = screen.getByText("T");
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveClass("im-admin-org-image-placeholder-text");
  });

  it("should prefer heroImage over logo when both are provided", () => {
    const orgWithBothImages = {
      ...mockOrganization,
      heroImage: "organizations/org-hero.jpg",
      logo: "organizations/org-logo.png",
    };
    render(<AdminOrganizationCard organization={orgWithBothImages} />);
    
    const image = screen.getByAltText("Hero image for Test Organization");
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute("src", expect.stringContaining("organizations/org-hero.jpg"));
    expect(screen.queryByAltText("Logo for Test Organization")).not.toBeInTheDocument();
  });
});
