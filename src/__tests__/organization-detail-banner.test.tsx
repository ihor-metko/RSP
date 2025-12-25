/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { EntityBanner } from "@/components/ui/EntityBanner";

// Mock the image utility
jest.mock("@/utils/image", () => ({
  isValidImageUrl: (url: string | null | undefined): url is string => {
    return typeof url === "string" && url.length > 0 && url.startsWith("http");
  },
  getImageUrl: (url: string | null | undefined): string | null => {
    // Pass through URLs for testing - in reality this would convert paths to full URLs
    return url || null;
  },
  getSupabaseStorageUrl: (url: string | null | undefined): string | null => {
    // Deprecated - kept for backward compatibility
    return url || null;
  },
}));

describe("Organization Detail Page - Banner Component", () => {
  describe("EntityBanner Rendering", () => {
    it("renders banner with organization title", () => {
      render(
        <EntityBanner
          title="Test Organization"
          subtitle="Leading sports organization"
          location="New York, USA"
        />
      );

      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("Leading sports organization")).toBeInTheDocument();
      expect(screen.getByText("New York, USA")).toBeInTheDocument();
    });

    it("renders placeholder when no image is provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          subtitle="Test subtitle"
        />
      );

      const placeholder = container.querySelector(".rsp-club-hero-placeholder");
      expect(placeholder).toBeInTheDocument();
      expect(screen.getByText("T")).toBeInTheDocument(); // First letter of "Test Organization"
    });

    it("renders with hero image when provided", () => {
      render(
        <EntityBanner
          title="Test Organization"
          imageUrl="https://example.com/hero.jpg"
          imageAlt="Test organization banner"
        />
      );

      const heroImage = screen.getByAltText("Test organization banner");
      expect(heroImage).toBeInTheDocument();
      expect(heroImage).toHaveAttribute("src", "https://example.com/hero.jpg");
    });

    it("renders with logo when provided", () => {
      render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo.png"
          logoAlt="Test organization logo"
        />
      );

      const logo = screen.getByAltText("Test organization logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "https://example.com/logo.png");
    });

    it("renders without subtitle when not provided", () => {
      render(
        <EntityBanner
          title="Test Organization"
          location="New York, USA"
        />
      );

      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("New York, USA")).toBeInTheDocument();
      // Subtitle should not be rendered
      const subtitleElement = screen.queryByText("Test subtitle");
      expect(subtitleElement).not.toBeInTheDocument();
    });

    it("renders without location when not provided", () => {
      render(
        <EntityBanner
          title="Test Organization"
          subtitle="Test subtitle"
        />
      );

      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("Test subtitle")).toBeInTheDocument();
      // Location icon should not be rendered
      const locationElements = screen.queryByText("New York, USA");
      expect(locationElements).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders with proper alt text for hero image", () => {
      render(
        <EntityBanner
          title="Test Organization"
          imageUrl="https://example.com/hero.jpg"
          imageAlt="Custom hero alt text"
        />
      );

      const heroImage = screen.getByAltText("Custom hero alt text");
      expect(heroImage).toBeInTheDocument();
    });

    it("defaults to title-based alt text when not provided", () => {
      render(
        <EntityBanner
          title="Test Organization"
          imageUrl="https://example.com/hero.jpg"
        />
      );

      const heroImage = screen.getByAltText("Test Organization hero image");
      expect(heroImage).toBeInTheDocument();
    });

    it("renders with proper data-testid", () => {
      render(
        <EntityBanner
          title="Test Organization"
        />
      );

      expect(screen.getByTestId("entity-banner")).toBeInTheDocument();
    });

    it("uses proper CSS class structure with rsp-club-hero classes", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          subtitle="Test subtitle"
          location="New York, USA"
        />
      );

      expect(container.querySelector(".rsp-club-hero")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-content")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-name")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-short-desc")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-location")).toBeInTheDocument();
    });

    it("renders location icon with aria-hidden attribute", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          location="New York, USA"
        />
      );

      const locationIcon = container.querySelector(".rsp-club-hero-location svg");
      expect(locationIcon).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("Visual Variants", () => {
    it("applies custom className when provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          className="custom-banner-class"
        />
      );

      const banner = container.querySelector(".rsp-club-hero.custom-banner-class");
      expect(banner).toBeInTheDocument();
    });

    it("renders placeholder with first letter in uppercase", () => {
      render(
        <EntityBanner
          title="organization"
        />
      );

      expect(screen.getByText("O")).toBeInTheDocument();
    });

    it("handles empty title gracefully", () => {
      render(
        <EntityBanner
          title=""
        />
      );

      // Should still render the banner even with empty title
      expect(screen.getByTestId("entity-banner")).toBeInTheDocument();
    });
  });

  describe("Integration with Organization Data", () => {
    it("renders organization banner with typical organization data", () => {
      const orgData = {
        name: "Global Sports Federation",
        address: "123 Sports Ave, New York, NY 10001",
        website: "https://globalsports.org",
      };

      render(
        <EntityBanner
          title={orgData.name}
          subtitle={orgData.address}
          location={orgData.address}
        />
      );

      expect(screen.getByText(orgData.name)).toBeInTheDocument();
      expect(screen.getAllByText(orgData.address).length).toBeGreaterThan(0);
    });

    it("renders organization banner without optional fields", () => {
      render(
        <EntityBanner
          title="Minimal Organization"
        />
      );

      expect(screen.getByText("Minimal Organization")).toBeInTheDocument();
      expect(screen.getByTestId("entity-banner")).toBeInTheDocument();
      // Should show placeholder since no image
      expect(screen.getByText("M")).toBeInTheDocument();
    });

    it("renders status badge when provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          status={{ label: "Published", variant: "published" }}
        />
      );

      expect(screen.getByText("Published")).toBeInTheDocument();
      const statusBadge = container.querySelector(".rsp-entity-status-badge--published");
      expect(statusBadge).toBeInTheDocument();
    });

    it("renders draft status badge", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          status={{ label: "Unpublished", variant: "draft" }}
        />
      );

      expect(screen.getByText("Unpublished")).toBeInTheDocument();
      const statusBadge = container.querySelector(".rsp-entity-status-badge--draft");
      expect(statusBadge).toBeInTheDocument();
    });

    it("renders archived status badge", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          status={{ label: "Archived", variant: "archived" }}
        />
      );

      expect(screen.getByText("Archived")).toBeInTheDocument();
      const statusBadge = container.querySelector(".rsp-entity-status-badge--archived");
      expect(statusBadge).toBeInTheDocument();
    });

    it("does not render status badge when not provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
        />
      );

      const statusBadge = container.querySelector(".rsp-entity-status-badge");
      expect(statusBadge).not.toBeInTheDocument();
    });

    it("auto-generates published status badge from isPublished prop", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          isPublished={true}
        />
      );

      expect(screen.getByText("Published")).toBeInTheDocument();
      const statusBadge = container.querySelector(".rsp-entity-status-badge--published");
      expect(statusBadge).toBeInTheDocument();
    });

    it("auto-generates unpublished status badge from isPublished prop", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          isPublished={false}
        />
      );

      expect(screen.getByText("Unpublished")).toBeInTheDocument();
      const statusBadge = container.querySelector(".rsp-entity-status-badge--draft");
      expect(statusBadge).toBeInTheDocument();
    });

    it("does not render publish/unpublish button - moved to DangerZone", () => {
      render(
        <EntityBanner
          title="Test Organization"
          isPublished={false}
        />
      );

      const publishButton = screen.queryByRole("button", { name: /publish test organization/i });
      expect(publishButton).not.toBeInTheDocument();
    });

    it("does not render unpublish button - moved to DangerZone", () => {
      render(
        <EntityBanner
          title="Test Organization"
          isPublished={true}
        />
      );

      const unpublishButton = screen.queryByRole("button", { name: /unpublish test organization/i });
      expect(unpublishButton).not.toBeInTheDocument();
    });

    it("does not render publish/unpublish button when isArchived is true", () => {
      const handleToggle = jest.fn();
      render(
        <EntityBanner
          title="Test Organization"
          isPublished={false}
          onTogglePublish={handleToggle}
          isArchived={true}
        />
      );

      const publishButton = screen.queryByRole("button", { name: /publish/i });
      expect(publishButton).not.toBeInTheDocument();
    });

    it("does not render publish/unpublish button when onTogglePublish is not provided", () => {
      render(
        <EntityBanner
          title="Test Organization"
          isPublished={false}
        />
      );

      const publishButton = screen.queryByRole("button", { name: /publish/i });
      expect(publishButton).not.toBeInTheDocument();
    });

    it("does not show processing text for removed publish/unpublish functionality", () => {
      render(
        <EntityBanner
          title="Test Organization"
          isPublished={true}
        />
      );

      const button = screen.queryByRole("button", { name: /unpublish test organization/i });
      expect(button).not.toBeInTheDocument();
    });

    it("prefers explicit status prop over auto-generated status", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          isPublished={true}
          status={{ label: "Custom Status", variant: "active" }}
        />
      );

      expect(screen.getByText("Custom Status")).toBeInTheDocument();
      expect(screen.queryByText("Published")).not.toBeInTheDocument();
      const statusBadge = container.querySelector(".rsp-entity-status-badge--active");
      expect(statusBadge).toBeInTheDocument();
    });

    it("hides admin features when hideAdminFeatures is true", () => {
      render(
        <EntityBanner
          title="Test Organization"
          subtitle="Test subtitle"
          isPublished={true}
          onTogglePublish={jest.fn()}
          onEdit={jest.fn()}
          hideAdminFeatures={true}
        />
      );

      // Should not show status badge
      expect(screen.queryByText("Published")).not.toBeInTheDocument();
      
      // Should not show publish/unpublish button
      expect(screen.queryByRole("button", { name: /unpublish/i })).not.toBeInTheDocument();
      
      // Should not show edit button
      expect(screen.queryByRole("button", { name: /edit/i })).not.toBeInTheDocument();
      
      // Should still show basic info
      expect(screen.getByText("Test Organization")).toBeInTheDocument();
      expect(screen.getByText("Test subtitle")).toBeInTheDocument();
    });

    it("shows admin features when hideAdminFeatures is false or not provided", () => {
      const mockToggle = jest.fn();
      const mockEdit = jest.fn();
      
      render(
        <EntityBanner
          title="Test Organization"
          isPublished={true}
          onTogglePublish={mockToggle}
          onEdit={mockEdit}
          hideAdminFeatures={false}
        />
      );

      // Should show status badge
      expect(screen.getByText("Published")).toBeInTheDocument();
      
      // Should NOT show publish/unpublish button (moved to DangerZone)
      expect(screen.queryByRole("button", { name: /unpublish test organization/i })).not.toBeInTheDocument();
      
      // Should show edit button
      expect(screen.getByRole("button", { name: /edit test organization details/i })).toBeInTheDocument();
    });
  });

  describe("Logo Theme and Contrast Enhancement", () => {
    it("applies no contrast class when no logo metadata is provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo.png"
        />
      );

      const logo = container.querySelector(".rsp-club-hero-logo");
      expect(logo).toBeInTheDocument();
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-light");
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-dark");
    });

    it("applies no contrast class when logo metadata has no logoTheme", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo.png"
          logoMetadata={{}}
        />
      );

      const logo = container.querySelector(".rsp-club-hero-logo");
      expect(logo).toBeInTheDocument();
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-light");
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-dark");
    });

    it("applies no contrast class when two separate logos are provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo-light.png"
          logoMetadata={{
            logoTheme: 'light',
            secondLogo: 'https://example.com/logo-dark.png',
            secondLogoTheme: 'dark',
          }}
        />
      );

      const logo = container.querySelector(".rsp-club-hero-logo");
      expect(logo).toBeInTheDocument();
      // Should not have contrast classes because theme-specific logos handle this
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-light");
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-dark");
    });

    it("applies light contrast class for light-themed logo in simulated dark mode", () => {
      // Mock dark theme by adding 'dark' class to document element
      document.documentElement.classList.add('dark');
      
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo.png"
          logoMetadata={{
            logoTheme: 'light',
          }}
        />
      );

      // Wait for effect to run
      setTimeout(() => {
        const logo = container.querySelector(".rsp-club-hero-logo");
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveClass("rsp-club-hero-logo--contrast-light");
      }, 100);

      // Cleanup
      document.documentElement.classList.remove('dark');
    });

    it("applies dark contrast class for dark-themed logo in simulated light mode", () => {
      // Ensure light theme (no 'dark' class)
      document.documentElement.classList.remove('dark');
      
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo.png"
          logoMetadata={{
            logoTheme: 'dark',
          }}
        />
      );

      // Wait for effect to run
      setTimeout(() => {
        const logo = container.querySelector(".rsp-club-hero-logo");
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveClass("rsp-club-hero-logo--contrast-dark");
      }, 100);
    });

    it("applies no contrast class when logo theme matches current theme", () => {
      // Light mode with light-themed logo
      document.documentElement.classList.remove('dark');
      
      const { container } = render(
        <EntityBanner
          title="Test Organization"
          logoUrl="https://example.com/logo.png"
          logoMetadata={{
            logoTheme: 'light',
          }}
        />
      );

      const logo = container.querySelector(".rsp-club-hero-logo");
      expect(logo).toBeInTheDocument();
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-light");
      expect(logo).not.toHaveClass("rsp-club-hero-logo--contrast-dark");
    });
  });
});
