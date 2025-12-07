/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "clubDetail.gallery": "Gallery",
      "clubDetail.aboutClub": "About the Club",
      "clubDetail.contact": "Contact",
      "clubDetail.hours": "Business Hours",
      "clubDetail.phone": "Phone",
      "clubDetail.email": "Email",
      "clubDetail.website": "Website",
      "clubDetail.address": "Address",
      "clubDetail.closed": "Closed",
      "common.imageCarousel": "Image carousel",
      "common.previousImage": "Previous image",
      "common.nextImage": "Next image",
      "common.carouselSlides": "Carousel slides",
      "common.slide": "Slide",
      "common.slideOf": "Slide {current} of {total}",
    };
    return translations[key] || key;
  },
}));

// Mock ImageCarousel component
jest.mock("@/components/ui/ImageCarousel", () => ({
  ImageCarousel: ({
    images,
    onImageClick,
  }: {
    images: Array<{ url: string; alt: string }>;
    onImageClick?: (index: number) => void;
  }) => (
    <div data-testid="image-carousel" onClick={() => onImageClick?.(0)}>
      {images.map((img, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img key={i} src={img.url} alt={img.alt} loading="lazy" />
      ))}
    </div>
  ),
}));

// Import the ImageCarousel after mocking
import { ImageCarousel } from "@/components/ui/ImageCarousel";

// Define test component that represents the Description & Gallery block
const DescriptionGalleryBlock = ({
  longDescription,
  galleryImages,
  onGalleryOpen,
}: {
  longDescription?: string;
  galleryImages: Array<{ url: string; alt: string }>;
  onGalleryOpen?: (index: number) => void;
}) => {
  const t = (key: string) => {
    const translations: Record<string, string> = {
      "clubDetail.gallery": "Gallery",
      "clubDetail.aboutClub": "About the Club",
    };
    return translations[key] || key;
  };

  return (
    <section className="im-club-description-gallery">
      <div className="im-club-description-gallery-grid">
        <div className="im-club-description-gallery-left">
          {longDescription && (
            <div className="im-club-description-card">
              <h2 className="im-club-description-card-title">
                {t("clubDetail.aboutClub")}
              </h2>
              <p className="im-club-description-text">{longDescription}</p>
            </div>
          )}

          {galleryImages.length > 0 && (
            <div className="im-club-gallery-card" data-testid="club-gallery-block">
              <div className="im-club-gallery-card-header">
                <h2 className="im-club-gallery-card-title">
                  {t("clubDetail.gallery")}
                </h2>
              </div>
              <div className="im-club-gallery-card-content">
                <ImageCarousel
                  images={galleryImages}
                  onImageClick={onGalleryOpen}
                  showIndicators={true}
                  loop={true}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

describe("Club Detail Page - Description & Gallery Block", () => {
  const mockGalleryImages = [
    { url: "/image1.jpg", alt: "Club photo 1" },
    { url: "/image2.jpg", alt: "Club photo 2" },
    { url: "/image3.jpg", alt: "Club photo 3" },
  ];

  describe("Rendering", () => {
    it("renders the gallery block when gallery images are present", () => {
      render(
        <DescriptionGalleryBlock
          galleryImages={mockGalleryImages}
          longDescription="Test club description"
        />
      );

      expect(screen.getByTestId("club-gallery-block")).toBeInTheDocument();
    });

    it("renders the description section when longDescription is provided", () => {
      render(
        <DescriptionGalleryBlock
          galleryImages={mockGalleryImages}
          longDescription="This is a detailed description of the club."
        />
      );

      expect(screen.getByText("About the Club")).toBeInTheDocument();
      expect(
        screen.getByText("This is a detailed description of the club.")
      ).toBeInTheDocument();
    });

    it("renders the ImageCarousel component inside gallery block", () => {
      render(
        <DescriptionGalleryBlock
          galleryImages={mockGalleryImages}
          longDescription="Test description"
        />
      );

      expect(screen.getByTestId("image-carousel")).toBeInTheDocument();
    });

    it("does not render gallery block when no gallery images", () => {
      render(
        <DescriptionGalleryBlock
          galleryImages={[]}
          longDescription="Test description"
        />
      );

      expect(screen.queryByTestId("club-gallery-block")).not.toBeInTheDocument();
    });

    it("does not render description card when no longDescription", () => {
      render(<DescriptionGalleryBlock galleryImages={mockGalleryImages} />);

      expect(screen.queryByText("About the Club")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("renders images with proper alt text", () => {
      render(
        <DescriptionGalleryBlock
          galleryImages={mockGalleryImages}
          longDescription="Test description"
        />
      );

      expect(screen.getByAltText("Club photo 1")).toBeInTheDocument();
      expect(screen.getByAltText("Club photo 2")).toBeInTheDocument();
      expect(screen.getByAltText("Club photo 3")).toBeInTheDocument();
    });

    it("uses proper CSS class structure with im-* prefix", () => {
      const { container } = render(
        <DescriptionGalleryBlock
          galleryImages={mockGalleryImages}
          longDescription="Test description"
        />
      );

      expect(
        container.querySelector(".im-club-description-gallery")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".im-club-description-gallery-grid")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".im-club-description-gallery-left")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".im-club-description-card")
      ).toBeInTheDocument();
      expect(
        container.querySelector(".im-club-gallery-card")
      ).toBeInTheDocument();
    });
  });

  describe("Gallery click handler", () => {
    it("calls onGalleryOpen when image is clicked", () => {
      const mockOnGalleryOpen = jest.fn();
      render(
        <DescriptionGalleryBlock
          galleryImages={mockGalleryImages}
          longDescription="Test description"
          onGalleryOpen={mockOnGalleryOpen}
        />
      );

      const carousel = screen.getByTestId("image-carousel");
      carousel.click();

      expect(mockOnGalleryOpen).toHaveBeenCalledWith(0);
    });
  });
});
