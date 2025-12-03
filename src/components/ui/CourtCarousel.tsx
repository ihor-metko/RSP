"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import "./CourtCarousel.css";

interface CourtCarouselProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  showIndicators?: boolean;
  showNavigation?: boolean;
  loop?: boolean;
  className?: string;
  itemKeyExtractor: (item: T, index: number) => string;
  /** Number of visible cards on mobile. Default is 1 */
  mobileVisible?: number;
  /** Number of visible cards on tablet. Default is 2 */
  tabletVisible?: number;
  /** Number of visible cards on desktop. Default is 3 */
  desktopVisible?: number;
  /** Enable lazy loading for large number of items. Default is true */
  lazyLoad?: boolean;
  /** Number of items to preload around visible items. Default is 1 */
  preloadCount?: number;
  /** Gap between cards in pixels. Default is 16 */
  gap?: number;
  /** Called when carousel navigates to a new position */
  onNavigate?: (index: number) => void;
}

export function CourtCarousel<T>({
  items,
  renderItem,
  showIndicators = true,
  showNavigation = true,
  loop = false,
  className = "",
  itemKeyExtractor,
  mobileVisible = 1,
  tabletVisible = 2,
  desktopVisible = 3,
  lazyLoad = true,
  preloadCount = 1,
  gap = 16,
  onNavigate,
}: CourtCarouselProps<T>) {
  const t = useTranslations();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(desktopVisible);
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Determine number of visible items based on screen size
  useEffect(() => {
    const updateVisibleCount = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setVisibleCount(mobileVisible);
      } else if (width < 1024) {
        setVisibleCount(tabletVisible);
      } else {
        setVisibleCount(desktopVisible);
      }
    };

    updateVisibleCount();
    window.addEventListener("resize", updateVisibleCount);
    return () => window.removeEventListener("resize", updateVisibleCount);
  }, [mobileVisible, tabletVisible, desktopVisible]);

  const totalItems = items.length;
  const maxIndex = Math.max(0, totalItems - visibleCount);

  const canGoPrevious = loop || currentIndex > 0;
  const canGoNext = loop || currentIndex < maxIndex;

  // Memoize which items should be rendered (for lazy loading)
  const renderedIndices = useMemo(() => {
    if (!lazyLoad) {
      return items.map((_, index) => index);
    }
    
    const indices: number[] = [];
    const startPreload = Math.max(0, currentIndex - preloadCount);
    const endPreload = Math.min(totalItems - 1, currentIndex + visibleCount + preloadCount);
    
    for (let i = startPreload; i <= endPreload; i++) {
      indices.push(i);
    }
    
    return indices;
  }, [lazyLoad, currentIndex, preloadCount, totalItems, visibleCount, items]);

  const handlePrevious = useCallback(() => {
    if (!canGoPrevious || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => {
      const newIndex = prev === 0 ? (loop ? maxIndex : 0) : prev - 1;
      onNavigate?.(newIndex);
      return newIndex;
    });
    setTimeout(() => setIsTransitioning(false), 300);
  }, [canGoPrevious, isTransitioning, loop, maxIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (!canGoNext || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => {
      const newIndex = prev >= maxIndex ? (loop ? 0 : maxIndex) : prev + 1;
      onNavigate?.(newIndex);
      return newIndex;
    });
    setTimeout(() => setIsTransitioning(false), 300);
  }, [canGoNext, isTransitioning, loop, maxIndex, onNavigate]);

  const handleGoToSlide = useCallback((index: number) => {
    if (isTransitioning || index === currentIndex) return;
    const clampedIndex = Math.max(0, Math.min(index, maxIndex));
    setIsTransitioning(true);
    setCurrentIndex(clampedIndex);
    onNavigate?.(clampedIndex);
    setTimeout(() => setIsTransitioning(false), 300);
  }, [isTransitioning, currentIndex, maxIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;
      
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          handlePrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleNext();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevious, handleNext]);

  // Touch/drag handlers
  const handleDragStart = useCallback((clientX: number) => {
    setIsDragging(true);
    setDragStartX(clientX);
    setDragOffset(0);
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - dragStartX;
    setDragOffset(offset);
  }, [isDragging, dragStartX]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    const threshold = 50;
    
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }
    
    setDragOffset(0);
  }, [isDragging, dragOffset, handlePrevious, handleNext]);

  // Mouse events
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleDragStart(e.clientX);
  }, [handleDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleDragMove(e.clientX);
  }, [handleDragMove]);

  const handleMouseUp = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleDragEnd();
    }
  }, [isDragging, handleDragEnd]);

  // Touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    handleDragStart(e.touches[0].clientX);
  }, [handleDragStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  }, [handleDragMove]);

  const handleTouchEnd = useCallback(() => {
    handleDragEnd();
  }, [handleDragEnd]);

  if (items.length === 0) {
    return null;
  }

  // Calculate the width percentage for each card based on visible count and gap
  const cardWidthPercent = 100 / visibleCount;
  
  // Calculate transform based on current index
  const transformValue = (() => {
    const baseOffset = currentIndex * cardWidthPercent;
    const dragPixels = isDragging ? dragOffset : 0;
    return `calc(-${baseOffset}% + ${dragPixels}px)`;
  })();

  // Calculate number of indicator dots
  const totalDots = maxIndex + 1;

  return (
    <div
      ref={containerRef}
      className={`im-court-carousel ${className}`}
      role="region"
      aria-label={t("common.imageCarousel")}
      aria-roledescription="carousel"
    >
      <div
        className="im-court-carousel-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="im-court-carousel-track"
          style={{
            transform: `translateX(${transformValue})`,
            transition: isDragging ? "none" : "transform 0.3s ease-out",
            gap: `${gap}px`,
          }}
          aria-live="polite"
        >
          {items.map((item, index) => {
            const isRendered = renderedIndices.includes(index);
            const isVisible = index >= currentIndex && index < currentIndex + visibleCount;
            
            return (
              <div
                key={itemKeyExtractor(item, index)}
                className="im-court-carousel-slide"
                style={{
                  flex: `0 0 calc(${cardWidthPercent}% - ${gap * (visibleCount - 1) / visibleCount}px)`,
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${totalItems}`}
                aria-hidden={!isVisible}
              >
                {isRendered ? (
                  renderItem(item, index)
                ) : (
                  <div className="im-court-carousel-placeholder" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation arrows */}
      {showNavigation && items.length > visibleCount && (
        <>
          <button
            type="button"
            className="im-court-carousel-nav im-court-carousel-nav--prev"
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            aria-label={t("common.previousImage")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15,18 9,12 15,6" />
            </svg>
          </button>
          <button
            type="button"
            className="im-court-carousel-nav im-court-carousel-nav--next"
            onClick={handleNext}
            disabled={!canGoNext}
            aria-label={t("common.nextImage")}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9,18 15,12 9,6" />
            </svg>
          </button>
        </>
      )}

      {/* Indicators */}
      {showIndicators && items.length > visibleCount && (
        <div
          className="im-court-carousel-indicators"
          role="tablist"
          aria-label={t("common.carouselSlides")}
        >
          {Array.from({ length: totalDots }).map((_, index) => (
            <button
              key={index}
              type="button"
              className={`im-court-carousel-indicator ${index === currentIndex ? "im-court-carousel-indicator--active" : ""}`}
              onClick={() => handleGoToSlide(index)}
              role="tab"
              aria-selected={index === currentIndex}
              aria-label={`${t("common.slide")} ${index + 1}`}
              tabIndex={index === currentIndex ? 0 : -1}
            />
          ))}
        </div>
      )}

      {/* Screen reader announcement */}
      <div className="im-court-carousel-sr-only" aria-live="polite" aria-atomic="true">
        {t("common.slideOf", { current: currentIndex + 1, total: totalDots })}
      </div>
    </div>
  );
}
