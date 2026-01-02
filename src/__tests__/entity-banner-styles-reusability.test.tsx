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
    return url || null;
  },
  getSupabaseStorageUrl: (url: string | null | undefined): string | null => {
    return url || null;
  },
}));

describe("EntityBanner Styles - Cross-Page Reusability", () => {
  describe("Style Classes Consistency", () => {
    it("applies core banner classes correctly", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          subtitle="Test subtitle"
          location="Test Location"
        />
      );

      // Verify core banner structure classes are present
      const banner = container.querySelector(".rsp-club-hero");
      expect(banner).toBeInTheDocument();
      
      const content = container.querySelector(".rsp-club-hero-content");
      expect(content).toBeInTheDocument();
      
      const main = container.querySelector(".rsp-club-hero-main");
      expect(main).toBeInTheDocument();
      
      const info = container.querySelector(".rsp-club-hero-info");
      expect(info).toBeInTheDocument();
    });

    it("applies text element classes correctly", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          subtitle="Test subtitle"
          location="Test Location"
        />
      );

      // Verify text element classes
      const title = container.querySelector(".rsp-club-hero-name");
      expect(title).toBeInTheDocument();
      expect(title).toHaveTextContent("Test Entity");
      
      const subtitle = container.querySelector(".rsp-club-hero-short-desc");
      expect(subtitle).toBeInTheDocument();
      expect(subtitle).toHaveTextContent("Test subtitle");
      
      const location = container.querySelector(".rsp-club-hero-location");
      expect(location).toBeInTheDocument();
      expect(location).toHaveTextContent("Test Location");
    });

    it("applies image classes when banner image is provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          imageUrl="https://example.com/banner.jpg"
        />
      );

      const image = container.querySelector(".rsp-club-hero-image");
      expect(image).toBeInTheDocument();
      
      const overlay = container.querySelector(".rsp-club-hero-overlay");
      expect(overlay).toBeInTheDocument();
    });

    it("applies placeholder classes when no banner image is provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
        />
      );

      const placeholder = container.querySelector(".rsp-club-hero-placeholder");
      expect(placeholder).toBeInTheDocument();
      
      const placeholderText = container.querySelector(".rsp-club-hero-placeholder-text");
      expect(placeholderText).toBeInTheDocument();
      expect(placeholderText).toHaveTextContent("T");
    });
  });

  describe("Status Badge Styles", () => {
    it("applies published status badge styles", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          isPublished={true}
        />
      );

      const badge = container.querySelector(".rsp-entity-status-badge--published");
      expect(badge).toBeInTheDocument();
    });

    it("applies draft status badge styles", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          isPublished={false}
        />
      );

      const badge = container.querySelector(".rsp-entity-status-badge--draft");
      expect(badge).toBeInTheDocument();
    });

    it("applies archived status badge styles", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          isArchived={true}
        />
      );

      const badge = container.querySelector(".rsp-entity-status-badge--archived");
      expect(badge).toBeInTheDocument();
    });

    it("applies active status badge styles", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          status={{ label: "Active", variant: "active" }}
        />
      );

      const badge = container.querySelector(".rsp-entity-status-badge--active");
      expect(badge).toBeInTheDocument();
    });

    it("applies inactive status badge styles", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          status={{ label: "Inactive", variant: "inactive" }}
        />
      );

      const badge = container.querySelector(".rsp-entity-status-badge--inactive");
      expect(badge).toBeInTheDocument();
    });
  });

  describe("Edit Button Styles", () => {
    it("applies edit button classes", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          onEdit={() => {}}
        />
      );

      const editBtn = container.querySelector(".rsp-entity-banner-edit-btn");
      expect(editBtn).toBeInTheDocument();
    });

    it("applies disabled edit button class when disabled", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          onEdit={() => {}}
          editDisabled={true}
        />
      );

      const editBtn = container.querySelector(".rsp-entity-banner-edit-btn");
      expect(editBtn).toBeInTheDocument();
      expect(editBtn).toHaveClass("rsp-entity-banner-edit-btn--disabled");
    });
  });

  describe("Actions Container Styles", () => {
    it("applies actions container class when status or actions are present", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          isPublished={true}
        />
      );

      const actionsContainer = container.querySelector(".rsp-entity-banner-actions");
      expect(actionsContainer).toBeInTheDocument();
    });

    it("applies actions container class when custom actions are provided", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          actions={<button>Custom Action</button>}
        />
      );

      const actionsContainer = container.querySelector(".rsp-entity-banner-actions");
      expect(actionsContainer).toBeInTheDocument();
    });
  });

  describe("Banner Alignment Support", () => {
    it("applies top alignment when bannerAlignment is 'top'", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          imageUrl="https://example.com/banner.jpg"
          bannerAlignment="top"
        />
      );

      const image = container.querySelector(".rsp-club-hero-image") as HTMLElement;
      expect(image).toBeInTheDocument();
      expect(image.style.objectPosition).toBe("top");
    });

    it("applies center alignment when bannerAlignment is 'center' (default)", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          imageUrl="https://example.com/banner.jpg"
          bannerAlignment="center"
        />
      );

      const image = container.querySelector(".rsp-club-hero-image") as HTMLElement;
      expect(image).toBeInTheDocument();
      expect(image.style.objectPosition).toBe("center");
    });

    it("applies bottom alignment when bannerAlignment is 'bottom'", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          imageUrl="https://example.com/banner.jpg"
          bannerAlignment="bottom"
        />
      );

      const image = container.querySelector(".rsp-club-hero-image") as HTMLElement;
      expect(image).toBeInTheDocument();
      expect(image.style.objectPosition).toBe("bottom");
    });
  });

  describe("Simulated Page Context - Organization Details", () => {
    it("renders correctly for organization context", () => {
      const { container } = render(
        <EntityBanner
          title="Global Sports Federation"
          subtitle="Leading sports organization"
          location="New York, USA"
          imageUrl="https://example.com/org-banner.jpg"
          logoUrl="https://example.com/org-logo.png"
          isPublished={true}
          onEdit={() => {}}
        />
      );

      expect(screen.getByText("Global Sports Federation")).toBeInTheDocument();
      expect(screen.getByText("Leading sports organization")).toBeInTheDocument();
      expect(screen.getByText("New York, USA")).toBeInTheDocument();
      
      // Verify all necessary style classes are present
      expect(container.querySelector(".rsp-club-hero")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-image")).toBeInTheDocument();
      expect(container.querySelector(".rsp-entity-status-badge--published")).toBeInTheDocument();
      expect(container.querySelector(".rsp-entity-banner-edit-btn")).toBeInTheDocument();
    });
  });

  describe("Simulated Page Context - Club Details", () => {
    it("renders correctly for club context", () => {
      const { container } = render(
        <EntityBanner
          title="Elite Tennis Club"
          subtitle="Premium tennis facilities"
          location="Los Angeles, CA"
          imageUrl="https://example.com/club-banner.jpg"
          logoUrl="https://example.com/club-logo.png"
          isPublished={false}
          onEdit={() => {}}
        />
      );

      expect(screen.getByText("Elite Tennis Club")).toBeInTheDocument();
      expect(screen.getByText("Premium tennis facilities")).toBeInTheDocument();
      expect(screen.getByText("Los Angeles, CA")).toBeInTheDocument();
      
      // Verify all necessary style classes are present
      expect(container.querySelector(".rsp-club-hero")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-image")).toBeInTheDocument();
      expect(container.querySelector(".rsp-entity-status-badge--draft")).toBeInTheDocument();
      expect(container.querySelector(".rsp-entity-banner-edit-btn")).toBeInTheDocument();
    });
  });

  describe("Simulated Page Context - Court Details", () => {
    it("renders correctly for court context without location", () => {
      const { container } = render(
        <EntityBanner
          title="Court A"
          subtitle="Indoor hard court"
          imageUrl="https://example.com/court-banner.jpg"
          bannerAlignment="center"
          onEdit={() => {}}
        />
      );

      expect(screen.getByText("Court A")).toBeInTheDocument();
      expect(screen.getByText("Indoor hard court")).toBeInTheDocument();
      
      // Court banners typically don't have location
      expect(screen.queryByText(/location/i)).not.toBeInTheDocument();
      
      // Verify all necessary style classes are present
      expect(container.querySelector(".rsp-club-hero")).toBeInTheDocument();
      expect(container.querySelector(".rsp-club-hero-image")).toBeInTheDocument();
      expect(container.querySelector(".rsp-entity-banner-edit-btn")).toBeInTheDocument();
    });

    it("renders correctly for court context with custom banner alignment", () => {
      const { container } = render(
        <EntityBanner
          title="Court B"
          subtitle="Outdoor clay court"
          imageUrl="https://example.com/court-banner-2.jpg"
          bannerAlignment="top"
        />
      );

      const image = container.querySelector(".rsp-club-hero-image") as HTMLElement;
      expect(image).toBeInTheDocument();
      expect(image.style.objectPosition).toBe("top");
    });
  });

  describe("CSS Class Naming Convention", () => {
    it("uses rsp-* prefix consistently for banner classes", () => {
      const { container } = render(
        <EntityBanner
          title="Test Entity"
          subtitle="Test subtitle"
          location="Test Location"
          imageUrl="https://example.com/banner.jpg"
          isPublished={true}
          onEdit={() => {}}
        />
      );

      // All these classes should be present and use rsp- prefix
      const rspClasses = [
        ".rsp-club-hero",
        ".rsp-club-hero-image",
        ".rsp-club-hero-overlay",
        ".rsp-club-hero-content",
        ".rsp-club-hero-main",
        ".rsp-club-hero-info",
        ".rsp-club-hero-name",
        ".rsp-club-hero-location",
        ".rsp-club-hero-short-desc",
        ".rsp-entity-banner-actions",
        ".rsp-entity-status-badge--published",
        ".rsp-entity-banner-edit-btn",
      ];

      rspClasses.forEach(className => {
        const element = container.querySelector(className);
        expect(element).toBeInTheDocument();
      });
    });
  });
});
