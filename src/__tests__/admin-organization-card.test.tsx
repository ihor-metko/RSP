/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { AdminOrganizationCard } from "@/components/admin/AdminOrganizationCard";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    // Special handling for imageAlt translations with parameters
    if (key === "organizations.imageAlt.heroImage" && params?.name) {
      return `Hero image for ${params.name}`;
    }
    if (key === "organizations.imageAlt.logo" && params?.name) {
      return `Logo for ${params.name}`;
    }
    return key;
  },
}));

// Mock image utilities
jest.mock("@/utils/image", () => ({
  isValidImageUrl: jest.fn((url) => url && url.startsWith("http")),
  getImageUrl: jest.fn((path) => path ? `https://example.com/api/images/${path}` : null),
  getSupabaseStorageUrl: jest.fn((path) => path ? `https://example.com/api/images/${path}` : null),
}));

describe("AdminOrganizationCard", () => {
  const mockOrganization = {
    id: "org-1",
    name: "Test Organization",
    slug: "test-organization",
    createdAt: "2024-01-15T00:00:00.000Z",
    clubCount: 5,
    isPublic: true,
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

  it("should show published status when isPublic is true", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    expect(screen.getByText("common.published")).toBeInTheDocument();
  });

  it("should show unpublished status when isPublic is false", () => {
    const orgUnpublished = { ...mockOrganization, isPublic: false };
    render(<AdminOrganizationCard organization={orgUnpublished} />);
    
    expect(screen.getByText("common.unpublished")).toBeInTheDocument();
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

  it("should display address when provided", () => {
    const orgWithAddress = {
      ...mockOrganization,
      address: "123 Main St, City, Country",
    };
    render(<AdminOrganizationCard organization={orgWithAddress} />);
    
    expect(screen.getByText("123 Main St, City, Country")).toBeInTheDocument();
  });

  it("should not display address section when address is not provided", () => {
    render(<AdminOrganizationCard organization={mockOrganization} />);
    
    // Address section should not be present
    expect(screen.queryByText(/Main St/)).not.toBeInTheDocument();
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

  it("should display both heroImage and logo when both are provided", () => {
    const orgWithBothImages = {
      ...mockOrganization,
      heroImage: "organizations/org-hero.jpg",
      logo: "organizations/org-logo.png",
    };
    render(<AdminOrganizationCard organization={orgWithBothImages} />);
    
    // Both banner and logo should be displayed
    const heroImage = screen.getByAltText("Hero image for Test Organization");
    expect(heroImage).toBeInTheDocument();
    expect(heroImage).toHaveAttribute("src", expect.stringContaining("organizations/org-hero.jpg"));
    
    const logoImage = screen.getByAltText("Logo for Test Organization");
    expect(logoImage).toBeInTheDocument();
    expect(logoImage).toHaveAttribute("src", expect.stringContaining("organizations/org-logo.png"));
    expect(logoImage).toHaveClass("im-admin-org-logo-overlay");
  });

  it("should display logo overlayed on banner with proper styling", () => {
    const orgWithBothImages = {
      ...mockOrganization,
      heroImage: "organizations/org-hero.jpg",
      logo: "organizations/org-logo.png",
    };
    render(<AdminOrganizationCard organization={orgWithBothImages} />);
    
    const logoImage = screen.getByAltText("Logo for Test Organization");
    expect(logoImage).toHaveClass("im-admin-org-logo-overlay");
  });

  it("should pass logo metadata to EntityLogo when metadata is provided", () => {
    const orgWithMetadata = {
      ...mockOrganization,
      heroImage: "organizations/org-hero.jpg",
      logo: "organizations/org-logo.png",
      metadata: {
        logoTheme: "dark" as const,
        secondLogo: "organizations/org-logo-light.png",
        secondLogoTheme: "light" as const,
      },
    };
    
    // The EntityLogo component will receive the metadata and apply appropriate styling
    // We're just verifying the component renders without errors when metadata is present
    render(<AdminOrganizationCard organization={orgWithMetadata} />);
    
    const logoImage = screen.getByAltText("Logo for Test Organization");
    expect(logoImage).toBeInTheDocument();
  });

  it("should handle organization without metadata gracefully", () => {
    const orgWithoutMetadata = {
      ...mockOrganization,
      heroImage: "organizations/org-hero.jpg",
      logo: "organizations/org-logo.png",
      metadata: null,
    };
    
    render(<AdminOrganizationCard organization={orgWithoutMetadata} />);
    
    const logoImage = screen.getByAltText("Logo for Test Organization");
    expect(logoImage).toBeInTheDocument();
  });
});
