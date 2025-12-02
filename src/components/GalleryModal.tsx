"use client";

import { useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import "./GalleryModal.css";

interface GalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{ url: string; alt: string }>;
  currentIndex: number;
  onNavigate: (index: number) => void;
}

export function GalleryModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onNavigate,
}: GalleryModalProps) {
  const t = useTranslations();

  const handlePrevious = useCallback(() => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1;
    onNavigate(newIndex);
  }, [currentIndex, images.length, onNavigate]);

  const handleNext = useCallback(() => {
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0;
    onNavigate(newIndex);
  }, [currentIndex, images.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, handlePrevious, handleNext]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];

  return (
    <div 
      className="rsp-gallery-modal-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("clubDetail.gallery")}
    >
      <div 
        className="rsp-gallery-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="rsp-gallery-modal-close"
          onClick={onClose}
          aria-label={t("common.close")}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              className="rsp-gallery-modal-nav rsp-gallery-modal-nav--prev"
              onClick={handlePrevious}
              aria-label="Previous image"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15,18 9,12 15,6" />
              </svg>
            </button>
            <button
              className="rsp-gallery-modal-nav rsp-gallery-modal-nav--next"
              onClick={handleNext}
              aria-label="Next image"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9,18 15,12 9,6" />
              </svg>
            </button>
          </>
        )}

        {/* Main image */}
        <div className="rsp-gallery-modal-image-container">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentImage.url}
            alt={currentImage.alt}
            className="rsp-gallery-modal-image"
          />
        </div>

        {/* Image counter and caption */}
        <div className="rsp-gallery-modal-footer">
          <span className="rsp-gallery-modal-counter">
            {currentIndex + 1} / {images.length}
          </span>
          {currentImage.alt && (
            <span className="rsp-gallery-modal-caption">{currentImage.alt}</span>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="rsp-gallery-modal-thumbnails">
            {images.map((image, index) => (
              <button
                key={index}
                className={`rsp-gallery-modal-thumbnail ${index === currentIndex ? "rsp-gallery-modal-thumbnail--active" : ""}`}
                onClick={() => onNavigate(index)}
                aria-label={`View image ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.alt}
                  className="rsp-gallery-modal-thumbnail-image"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
