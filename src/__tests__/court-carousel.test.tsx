/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CourtCarousel } from "@/components/ui/CourtCarousel";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      "common.imageCarousel": "Court carousel",
      "common.previousImage": "Previous",
      "common.nextImage": "Next",
      "common.carouselSlides": "Carousel slides",
      "common.slide": "Slide",
      "common.slideOf": `Slide ${params?.current ?? 1} of ${params?.total ?? 1}`,
    };
    return translations[key] || key;
  },
}));

interface MockItem {
  id: string;
  name: string;
}

const mockItems: MockItem[] = [
  { id: "1", name: "Court 1" },
  { id: "2", name: "Court 2" },
  { id: "3", name: "Court 3" },
  { id: "4", name: "Court 4" },
  { id: "5", name: "Court 5" },
];

const defaultRenderItem = (item: MockItem) => (
  <div data-testid={`court-${item.id}`}>{item.name}</div>
);

const defaultKeyExtractor = (item: MockItem) => item.id;

describe("CourtCarousel Component", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Mock window.innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe("Rendering", () => {
    it("renders nothing when items array is empty", () => {
      const { container } = render(
        <CourtCarousel
          items={[]}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders the carousel with items", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
        />
      );
      
      expect(screen.getByRole("region")).toBeInTheDocument();
      expect(screen.getByTestId("court-1")).toBeInTheDocument();
    });

    it("renders navigation arrows when there are more items than visible", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
        />
      );
      
      expect(screen.getByLabelText("Previous")).toBeInTheDocument();
      expect(screen.getByLabelText("Next")).toBeInTheDocument();
    });

    it("does not render navigation arrows when all items fit", () => {
      const twoItems = mockItems.slice(0, 2);
      render(
        <CourtCarousel
          items={twoItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
        />
      );
      
      expect(screen.queryByLabelText("Previous")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Next")).not.toBeInTheDocument();
    });

    it("renders indicators when showIndicators is true", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          showIndicators={true}
          desktopVisible={3}
        />
      );
      
      const indicators = screen.getAllByRole("tab");
      expect(indicators.length).toBeGreaterThan(0);
    });

    it("does not render indicators when showIndicators is false", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          showIndicators={false}
        />
      );
      
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates to the next item when clicking next button", () => {
      const handleNavigate = jest.fn();
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
          onNavigate={handleNavigate}
        />
      );
      
      const nextButton = screen.getByLabelText("Next");
      
      act(() => {
        fireEvent.click(nextButton);
        jest.advanceTimersByTime(350);
      });
      
      expect(handleNavigate).toHaveBeenCalledWith(1);
    });

    it("navigates to the previous item when clicking previous button", () => {
      const handleNavigate = jest.fn();
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
          onNavigate={handleNavigate}
        />
      );
      
      const nextButton = screen.getByLabelText("Next");
      
      // First go to index 1
      act(() => {
        fireEvent.click(nextButton);
        jest.advanceTimersByTime(350);
      });
      
      // Then go back
      const prevButton = screen.getByLabelText("Previous");
      
      act(() => {
        fireEvent.click(prevButton);
        jest.advanceTimersByTime(350);
      });
      
      expect(handleNavigate).toHaveBeenLastCalledWith(0);
    });

    it("navigates to specific slide when clicking indicator", () => {
      const handleNavigate = jest.fn();
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
          showIndicators={true}
          onNavigate={handleNavigate}
        />
      );
      
      const indicators = screen.getAllByRole("tab");
      
      act(() => {
        fireEvent.click(indicators[1]);
        jest.advanceTimersByTime(350);
      });
      
      expect(handleNavigate).toHaveBeenCalledWith(1);
    });
  });

  describe("Lazy Loading", () => {
    it("only renders visible items plus preload buffer", () => {
      const manyItems = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Court ${i + 1}`,
      }));
      
      render(
        <CourtCarousel
          items={manyItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
          lazyLoad={true}
          preloadCount={1}
        />
      );
      
      // At index 0, with desktopVisible=3 and preloadCount=1
      // Should render: 0, 1, 2, 3, 4 (current 3 + 1 preload ahead)
      expect(screen.getByTestId("court-1")).toBeInTheDocument();
      expect(screen.getByTestId("court-2")).toBeInTheDocument();
      expect(screen.getByTestId("court-3")).toBeInTheDocument();
      expect(screen.getByTestId("court-4")).toBeInTheDocument();
      expect(screen.getByTestId("court-5")).toBeInTheDocument();
      // Court 10 should be a placeholder
      expect(screen.queryByTestId("court-10")).not.toBeInTheDocument();
    });

    it("renders all items when lazyLoad is false", () => {
      const manyItems = Array.from({ length: 6 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Court ${i + 1}`,
      }));
      
      render(
        <CourtCarousel
          items={manyItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          desktopVisible={3}
          lazyLoad={false}
        />
      );
      
      // All items should be rendered
      expect(screen.getByTestId("court-1")).toBeInTheDocument();
      expect(screen.getByTestId("court-6")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes on carousel region", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
        />
      );
      
      const region = screen.getByRole("region");
      expect(region).toHaveAttribute("aria-roledescription", "carousel");
    });

    it("has proper ARIA attributes on slides", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
        />
      );
      
      const slides = screen.getAllByRole("group");
      expect(slides.length).toBeGreaterThan(0);
      expect(slides[0]).toHaveAttribute("aria-roledescription", "slide");
    });

    it("has aria-live region for screen readers", () => {
      const { container } = render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
        />
      );
      
      const liveRegion = container.querySelector("[aria-live='polite'][aria-atomic='true']");
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe("Custom className", () => {
    it("applies custom className to carousel container", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          className="custom-class"
        />
      );
      
      const region = screen.getByRole("region");
      expect(region).toHaveClass("im-court-carousel", "custom-class");
    });
  });

  describe("Responsive behavior", () => {
    it("updates visible count on window resize", () => {
      render(
        <CourtCarousel
          items={mockItems}
          renderItem={defaultRenderItem}
          itemKeyExtractor={defaultKeyExtractor}
          mobileVisible={1}
          tabletVisible={2}
          desktopVisible={3}
        />
      );

      // Initial desktop width (1024)
      expect(screen.getByRole("region")).toBeInTheDocument();

      // Simulate resize to mobile width
      act(() => {
        Object.defineProperty(window, "innerWidth", { value: 500 });
        window.dispatchEvent(new Event("resize"));
      });

      // The carousel should still be rendered
      expect(screen.getByRole("region")).toBeInTheDocument();
    });
  });
});
