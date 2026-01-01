"use client";

import { useState, useCallback, useRef } from "react";
import { Button, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { isValidImageUrl, getImageUrl } from "@/utils/image";
import type { ClubDetail } from "@/types/club";
import "./ClubGalleryView.css";

interface GalleryImage {
  id?: string;
  imageUrl: string;
  imageKey?: string | null;
  altText?: string | null;
  sortOrder: number;
  file?: File;
  preview?: string;
}

interface ClubGalleryViewProps {
  club: ClubDetail;
  onRefresh?: () => Promise<void>;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function ClubGalleryView({ club, onRefresh, disabled = false, disabledTooltip }: ClubGalleryViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [bannerUrl, setBannerUrl] = useState<string | null>(club.bannerData?.url || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(club.logoData?.url || null);
  const [gallery, setGallery] = useState<GalleryImage[]>(() =>
    club.gallery.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      imageKey: img.imageKey,
      altText: img.altText,
      sortOrder: img.sortOrder,
    }))
  );

  const heroInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = useCallback(() => {
    setBannerUrl(club.bannerData?.url || null);
    setLogoUrl(club.logoData?.url || null);
    setGallery(
      club.gallery.map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        imageKey: img.imageKey,
        altText: img.altText,
        sortOrder: img.sortOrder,
      }))
    );
    setError("");
    setIsEditing(true);
  }, [club]);

  const handleClose = useCallback(() => {
    // Revoke any blob URLs
    gallery.forEach((img) => {
      if (img.preview) {
        URL.revokeObjectURL(img.preview);
      }
    });
    setIsEditing(false);
    setError("");
  }, [gallery]);

  const uploadFile = useCallback(async (file: File): Promise<{ url: string; key: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`/api/admin/clubs/${club.id}/images`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Upload failed");
    }

    return response.json();
  }, [club.id]);

  const handleHeroUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError("");
      try {
        const { url } = await uploadFile(file);
        setBannerUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload hero image");
      } finally {
        setIsUploading(false);
        if (heroInputRef.current) {
          heroInputRef.current.value = "";
        }
      }
    },
    [uploadFile]
  );

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(true);
      setError("");
      try {
        const { url } = await uploadFile(file);
        setLogoUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload logo");
      } finally {
        setIsUploading(false);
        if (logoInputRef.current) {
          logoInputRef.current.value = "";
        }
      }
    },
    [uploadFile]
  );

  const handleGalleryUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      setIsUploading(true);
      setError("");
      try {
        const newImages: GalleryImage[] = [];
        for (const file of files) {
          const { url, key } = await uploadFile(file);
          newImages.push({
            imageUrl: url,
            imageKey: key,
            altText: file.name,
            sortOrder: gallery.length + newImages.length,
          });
        }
        setGallery((prev) => [...prev, ...newImages]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload images");
      } finally {
        setIsUploading(false);
        if (galleryInputRef.current) {
          galleryInputRef.current.value = "";
        }
      }
    },
    [gallery.length, uploadFile]
  );

  const handleRemoveGalleryImage = useCallback(async (index: number) => {
    const image = gallery[index];

    // If image has an ID, delete from server
    if (image.id) {
      try {
        const response = await fetch(
          `/api/admin/clubs/${club.id}/images/${image.id}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          throw new Error("Failed to delete image");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete image");
        return;
      }
    }

    // Revoke blob URL if exists
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }

    setGallery((prev) => prev.filter((_, i) => i !== index));
  }, [club.id, gallery]);

  const handleSetHeroFromGallery = useCallback((imageUrl: string) => {
    setBannerUrl(imageUrl);
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/clubs/${club.id}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bannerData: bannerUrl ? { url: bannerUrl } : null,
          logoData: logoUrl ? { url: logoUrl } : null,
          gallery: gallery.map((img, index) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            imageKey: img.imageKey || null,
            altText: img.altText || null,
            sortOrder: index,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update media");
      }

      // Refresh club data to reflect changes
      if (onRefresh) {
        await onRefresh();
      }

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [bannerUrl, logoUrl, gallery, club.id, onRefresh]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">Gallery</h2>
        <Tooltip
          content={disabled ? disabledTooltip : undefined}
          position="bottom"
        >
          <Button
            variant="outline"
            onClick={handleEdit}
            disabled={disabled}
          >
            Edit
          </Button>
        </Tooltip>
      </div>

      <div className="im-section-view">
        <div className="im-gallery-view-hero">
          {isValidImageUrl(club.bannerData?.url) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getImageUrl(club.bannerData?.url) ?? ""}
              alt="Club hero"
              className="im-gallery-view-hero-img"
            />
          ) : (
            <div className="im-gallery-view-placeholder">No hero image</div>
          )}
        </div>

        {club.gallery.length > 0 && (
          <div className="im-gallery-view-thumbnails">
            {club.gallery.map((img) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={img.id}
                src={getImageUrl(img.imageUrl) ?? ""}
                alt={img.altText || "Gallery image"}
                className="im-gallery-view-thumb"
              />
            ))}
          </div>
        )}
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title="Edit Gallery"
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <div className="im-gallery-edit-section">
          <h3 className="im-gallery-edit-section-title">Hero Image</h3>
          <div className="im-gallery-edit-hero">
            {isValidImageUrl(bannerUrl) ? (
              <div className="im-gallery-edit-hero-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(bannerUrl) ?? ""} alt="Hero preview" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBannerUrl(null)}
                  className="im-gallery-edit-remove"
                  disabled={isSaving || isUploading}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="im-gallery-edit-upload-btn"
                onClick={() => heroInputRef.current?.click()}
                disabled={isSaving || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload Hero Image"}
              </button>
            )}
            <input
              ref={heroInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleHeroUpload}
              className="hidden"
              disabled={isSaving || isUploading}
            />
          </div>
        </div>

        <div className="im-gallery-edit-section">
          <h3 className="im-gallery-edit-section-title">Logo</h3>
          <div className="im-gallery-edit-logo">
            {isValidImageUrl(logoUrl) ? (
              <div className="im-gallery-edit-logo-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getImageUrl(logoUrl) ?? ""} alt="Logo preview" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLogoUrl(null)}
                  className="im-gallery-edit-remove"
                  disabled={isSaving || isUploading}
                >
                  ✕
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="im-gallery-edit-upload-btn"
                onClick={() => logoInputRef.current?.click()}
                disabled={isSaving || isUploading}
              >
                {isUploading ? "Uploading..." : "Upload Logo"}
              </button>
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={isSaving || isUploading}
            />
          </div>
        </div>

        <div className="im-gallery-edit-section">
          <div className="im-gallery-edit-section-header">
            <h3 className="im-gallery-edit-section-title">Gallery Images</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isSaving || isUploading}
            >
              {isUploading ? "Uploading..." : "+ Add Images"}
            </Button>
          </div>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleGalleryUpload}
            className="hidden"
            disabled={isSaving || isUploading}
          />
          {gallery.length > 0 ? (
            <div className="im-gallery-edit-grid">
              {gallery.map((img, index) => (
                <div key={img.id || index} className="im-gallery-edit-item">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview || (getImageUrl(img.imageUrl) ?? "")}
                    alt={img.altText || `Gallery image ${index + 1}`}
                  />
                  <div className="im-gallery-edit-item-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSetHeroFromGallery(img.imageUrl)}
                      className="im-gallery-edit-set-hero"
                      disabled={isSaving || isUploading}
                    >
                      Set as Hero
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveGalleryImage(index)}
                      className="im-gallery-edit-remove"
                      disabled={isSaving || isUploading}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="im-section-view-value--empty">No gallery images</p>
          )}
        </div>
      </SectionEditModal>
    </>
  );
}
