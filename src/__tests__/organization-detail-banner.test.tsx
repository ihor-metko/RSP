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
  });
});
