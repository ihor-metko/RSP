/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, screen } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubs.viewClub": "View Club",
      "common.address": "Address",
      "common.hours": "Hours",
      "common.indoor": "Indoor",
      "common.outdoor": "Outdoor",
    };
    return translations[key] || key;
  },
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({
    children,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  IMLink: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
  EntityLogo: ({
    logoUrl,
    alt,
    className,
  }: {
    logoUrl: string | null | undefined;
    alt: string;
    className?: string;
  }) => {
    // Only render if logoUrl is valid
    if (!logoUrl || typeof logoUrl !== 'string' || logoUrl.length === 0) {
      return null;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={alt} className={className} />
    );
  },
}));

import { PublicClubCard, PublicClubCardProps } from "@/components/PublicClubCard";

describe("PublicClubCard", () => {
  const baseClub: PublicClubCardProps["club"] = {
    id: "club-1",
    name: "Test Club",
    location: "123 Main Street",
    indoorCount: 2,
    outdoorCount: 3,
  };

  describe("Basic Rendering", () => {
    it("renders club name", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByText("Test Club")).toBeInTheDocument();
    });

    it("renders address with location", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByText("123 Main Street")).toBeInTheDocument();
    });

    it("renders indoor court badge when indoorCount > 0", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByText("2 Indoor")).toBeInTheDocument();
    });

    it("renders outdoor court badge when outdoorCount > 0", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByText("3 Outdoor")).toBeInTheDocument();
    });

    it("renders View Club button", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByRole("button", { name: /View Club/i })).toBeInTheDocument();
    });
  });

  describe("Image Display", () => {
    it("renders hero image when provided and valid", () => {
      const clubWithHero = {
        ...baseClub,
        heroImage: "https://example.com/hero.jpg",
      };
      render(<PublicClubCard club={clubWithHero} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/hero.jpg");
    });

    it("falls back to logo when heroImage is not provided", () => {
      const clubWithLogo = {
        ...baseClub,
        logo: "https://example.com/logo.png",
      };
      render(<PublicClubCard club={clubWithLogo} />);
      const img = screen.getByAltText("Test Club logo");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/logo.png");
    });

    it("renders placeholder when no images are provided", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByText("T")).toBeInTheDocument(); // First letter of "Test Club"
    });

    it("uses image paths as-is without Supabase transformation", () => {
      const clubWithStoragePath = {
        ...baseClub,
        heroImage: "/uploads/clubs/abc123.jpg",
      };
      render(<PublicClubCard club={clubWithStoragePath} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "/uploads/clubs/abc123.jpg"
      );
    });

    it("uses original path for new API-based image URLs", () => {
      const clubWithApiPath = {
        ...baseClub,
        heroImage: "/api/images/clubs/club-123/image-456.jpg",
      };
      render(<PublicClubCard club={clubWithApiPath} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute(
        "src",
        "/api/images/clubs/club-123/image-456.jpg"
      );
    });
  });

  describe("Banner Alignment", () => {
    it("applies default center alignment when bannerData is not provided", () => {
      const clubWithBanner = {
        ...baseClub,
        bannerData: { url: "https://example.com/banner.jpg" },
      };
      render(<PublicClubCard club={clubWithBanner} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toHaveStyle({ objectPosition: 'center' });
    });

    it("applies top alignment when bannerAlignment is top", () => {
      const clubWithBanner = {
        ...baseClub,
        bannerData: { 
          url: "https://example.com/banner.jpg",
          bannerAlignment: 'top'
        },
      };
      render(<PublicClubCard club={clubWithBanner} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toHaveStyle({ objectPosition: 'top' });
    });

    it("applies bottom alignment when bannerAlignment is bottom", () => {
      const clubWithBanner = {
        ...baseClub,
        bannerData: { 
          url: "https://example.com/banner.jpg",
          bannerAlignment: 'bottom'
        },
      };
      render(<PublicClubCard club={clubWithBanner} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toHaveStyle({ objectPosition: 'bottom' });
    });

    it("applies center alignment when bannerAlignment is center", () => {
      const clubWithBanner = {
        ...baseClub,
        bannerData: { 
          url: "https://example.com/banner.jpg",
          bannerAlignment: 'center'
        },
      };
      render(<PublicClubCard club={clubWithBanner} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toHaveStyle({ objectPosition: 'center' });
    });

    it("falls back to position field if bannerAlignment is not provided", () => {
      const clubWithBanner = {
        ...baseClub,
        bannerData: { 
          url: "https://example.com/banner.jpg",
          position: 'bottom'
        },
      };
      render(<PublicClubCard club={clubWithBanner} />);
      const img = screen.getByAltText("Test Club main image");
      expect(img).toHaveStyle({ objectPosition: 'bottom' });
    });

    it("defaults to center when bannerData is invalid JSON string", () => {
      const clubWithInvalidBanner = {
        ...baseClub,
        bannerData: "invalid json",
      };
      render(<PublicClubCard club={clubWithInvalidBanner as any} />);
      // Should render placeholder since invalid bannerData means no valid image
      expect(screen.getByText("T")).toBeInTheDocument();
    });
  });

  describe("Short Description", () => {
    it("renders short description when provided", () => {
      const clubWithDesc = {
        ...baseClub,
        shortDescription: "A great place to play padel",
      };
      render(<PublicClubCard club={clubWithDesc} />);
      expect(screen.getByText("A great place to play padel")).toBeInTheDocument();
    });

    it("does not render description element when not provided", () => {
      const { container } = render(<PublicClubCard club={baseClub} />);
      expect(container.querySelector(".rsp-club-description")).not.toBeInTheDocument();
    });
  });

  describe("Address Formatting", () => {
    it("formats address as City, Location when city is provided", () => {
      const clubWithCity = {
        ...baseClub,
        city: "New York",
        location: "123 Main Street",
      };
      render(<PublicClubCard club={clubWithCity} />);
      expect(screen.getByText("New York, 123 Main Street")).toBeInTheDocument();
    });

    it("shows location only when city matches start of location", () => {
      const clubWithCity = {
        ...baseClub,
        city: "New York",
        location: "New York, 123 Main Street",
      };
      render(<PublicClubCard club={clubWithCity} />);
      expect(screen.getByText("New York, 123 Main Street")).toBeInTheDocument();
    });

    it("shows just location when city is not provided", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByText("123 Main Street")).toBeInTheDocument();
    });
  });

  describe("Tags/Badges", () => {
    it("renders tags when provided as JSON array", () => {
      const clubWithTags = {
        ...baseClub,
        tags: '["Tennis", "Padel", "Fitness"]',
      };
      render(<PublicClubCard club={clubWithTags} />);
      expect(screen.getByText("Tennis")).toBeInTheDocument();
      expect(screen.getByText("Padel")).toBeInTheDocument();
      expect(screen.getByText("Fitness")).toBeInTheDocument();
    });

    it("renders tags when provided as comma-separated string", () => {
      const clubWithTags = {
        ...baseClub,
        tags: "Tennis, Padel, Fitness",
      };
      render(<PublicClubCard club={clubWithTags} />);
      expect(screen.getByText("Tennis")).toBeInTheDocument();
      expect(screen.getByText("Padel")).toBeInTheDocument();
      expect(screen.getByText("Fitness")).toBeInTheDocument();
    });

    it("limits visible tags to 3 and shows +N for additional", () => {
      const clubWithManyTags = {
        ...baseClub,
        tags: '["Tennis", "Padel", "Fitness", "Squash", "Gym"]',
      };
      render(<PublicClubCard club={clubWithManyTags} />);
      expect(screen.getByText("Tennis")).toBeInTheDocument();
      expect(screen.getByText("Padel")).toBeInTheDocument();
      expect(screen.getByText("Fitness")).toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
      expect(screen.queryByText("Squash")).not.toBeInTheDocument();
    });
  });

  describe("Role-based Navigation", () => {
    it("links to /clubs/{id} for player role (default)", () => {
      render(<PublicClubCard club={baseClub} />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/clubs/club-1");
    });

    it("links to /admin/clubs/{id} for super_admin role", () => {
      render(<PublicClubCard club={baseClub} role="super_admin" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/admin/clubs/club-1");
    });

    it("links to /coach/clubs/{id} for coach role", () => {
      render(<PublicClubCard club={baseClub} role="coach" />);
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/coach/clubs/club-1");
    });
  });

  describe("Accessibility", () => {
    it("renders as article element", () => {
      render(<PublicClubCard club={baseClub} />);
      expect(screen.getByRole("article")).toBeInTheDocument();
    });

    it("has aria-labelledby pointing to club name", () => {
      render(<PublicClubCard club={baseClub} />);
      const article = screen.getByRole("article");
      expect(article).toHaveAttribute("aria-labelledby", "club-name-club-1");
    });

    it("has proper aria-label on address element", () => {
      render(<PublicClubCard club={baseClub} />);
      const addressElement = screen.getByLabelText(/Address:/);
      expect(addressElement).toBeInTheDocument();
    });

    it("has aria-label on View Club button", () => {
      render(<PublicClubCard club={baseClub} />);
      const button = screen.getByRole("button", { name: /View Club Test Club/i });
      expect(button).toBeInTheDocument();
    });

    it("has role=list on court badges container", () => {
      render(<PublicClubCard club={baseClub} />);
      const list = screen.getByRole("list", { name: "Court types" });
      expect(list).toBeInTheDocument();
    });
  });

  describe("CSS Classes", () => {
    it("applies modern card class", () => {
      const { container } = render(<PublicClubCard club={baseClub} />);
      expect(container.querySelector(".rsp-club-card--modern")).toBeInTheDocument();
    });

    it("applies proper image section classes", () => {
      const { container } = render(<PublicClubCard club={baseClub} />);
      expect(container.querySelector(".rsp-club-card-image")).toBeInTheDocument();
    });

    it("applies proper content section classes", () => {
      const { container } = render(<PublicClubCard club={baseClub} />);
      expect(container.querySelector(".rsp-club-card-content")).toBeInTheDocument();
    });

    it("applies proper actions section classes", () => {
      const { container } = render(<PublicClubCard club={baseClub} />);
      expect(container.querySelector(".rsp-club-card-actions")).toBeInTheDocument();
    });
  });
});
