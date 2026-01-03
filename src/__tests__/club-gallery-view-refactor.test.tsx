/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubDetail.gallery": "Gallery",
      "clubDetail.galleryImages": "Gallery Images",
      "clubDetail.noGalleryImages": "No gallery images",
      "clubDetail.editGallery": "Edit Gallery",
      "clubDetail.galleryImageAlt": "Gallery image",
      "common.edit": "Edit",
    };
    return translations[key] || key;
  },
}));

// Mock the admin club store
jest.mock("@/stores/useAdminClubStore", () => ({
  useAdminClubStore: jest.fn(() => ({
    updateClubInStore: jest.fn(),
  })),
}));

// Mock UI components
jest.mock("@/components/ui", () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: any) => <>{children}</>,
}));

// Mock SectionEditModal
jest.mock("@/components/admin/club/SectionEditModal", () => ({
  SectionEditModal: ({ children, isOpen }: any) => (
    isOpen ? <div data-testid="edit-modal">{children}</div> : null
  ),
}));

// Mock image utils
jest.mock("@/utils/image", () => ({
  isValidImageUrl: (url: string | undefined | null) => !!url,
  getImageUrl: (url: string | undefined | null) => url,
}));

import { ClubGalleryView } from "@/components/admin/club/ClubGalleryView";
import type { ClubDetail } from "@/types/club";

describe("ClubGalleryView - Gallery Only Refactor", () => {
  const mockClub: ClubDetail = {
    id: "club-1",
    organizationId: "org-1",
    name: "Test Club",
    slug: "test-club",
    shortDescription: "A test club",
    longDescription: null,
    location: "Test Location",
    city: "Test City",
    country: "Test Country",
    latitude: null,
    longitude: null,
    phone: null,
    email: null,
    website: null,
    socialLinks: null,
    contactInfo: null,
    openingHours: null,
    logoData: { url: "https://example.com/logo.jpg" },
    bannerData: { url: "https://example.com/banner.jpg" },
    metadata: null,
    defaultCurrency: null,
    timezone: null,
    isPublic: true,
    status: "active",
    tags: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    courts: [],
    coaches: [],
    gallery: [
      {
        id: "img-1",
        clubId: "club-1",
        imageUrl: "https://example.com/gallery1.jpg",
        imageKey: "key1",
        altText: "Gallery Image 1",
        sortOrder: 0,
        createdAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "img-2",
        clubId: "club-1",
        imageUrl: "https://example.com/gallery2.jpg",
        imageKey: "key2",
        altText: "Gallery Image 2",
        sortOrder: 1,
        createdAt: "2024-01-01T00:00:00Z",
      },
    ],
    businessHours: [],
  };

  it("should render gallery section with only gallery images", () => {
    render(<ClubGalleryView club={mockClub} />);

    // Verify gallery section is present
    expect(screen.getByText("Gallery")).toBeInTheDocument();

    // Verify gallery images are displayed
    const galleryImages = screen.getAllByRole("img");
    expect(galleryImages).toHaveLength(2);
    expect(galleryImages[0]).toHaveAttribute("src", "https://example.com/gallery1.jpg");
    expect(galleryImages[1]).toHaveAttribute("src", "https://example.com/gallery2.jpg");
  });

  it("should NOT display banner image in gallery view", () => {
    render(<ClubGalleryView club={mockClub} />);

    // The banner URL should not appear in the gallery section
    const images = screen.getAllByRole("img");
    const bannerImage = images.find(img => 
      img.getAttribute("src")?.includes("banner.jpg")
    );
    expect(bannerImage).toBeUndefined();
  });

  it("should NOT display logo image in gallery view", () => {
    render(<ClubGalleryView club={mockClub} />);

    // The logo URL should not appear in the gallery section
    const images = screen.getAllByRole("img");
    const logoImage = images.find(img => 
      img.getAttribute("src")?.includes("logo.jpg")
    );
    expect(logoImage).toBeUndefined();
  });

  it("should display message when no gallery images exist", () => {
    const clubWithoutGallery: ClubDetail = {
      ...mockClub,
      gallery: [],
    };

    render(<ClubGalleryView club={clubWithoutGallery} />);

    expect(screen.getByText("No gallery images")).toBeInTheDocument();
  });

  it("should have edit button for gallery management", () => {
    render(<ClubGalleryView club={mockClub} />);

    const editButton = screen.getByText("Edit");
    expect(editButton).toBeInTheDocument();
  });

  it("should render with disabled state when disabled prop is true", () => {
    render(<ClubGalleryView club={mockClub} disabled={true} />);

    const editButton = screen.getByText("Edit");
    expect(editButton).toBeDisabled();
  });
});
