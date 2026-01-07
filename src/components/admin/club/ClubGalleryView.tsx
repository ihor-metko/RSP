"use client";

import { useState, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
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
  disabled?: boolean;
  disabledTooltip?: string;
}

export function ClubGalleryView({ club, disabled = false, disabledTooltip }: ClubGalleryViewProps) {
  const t = useTranslations("clubDetail");
  const tCommon = useTranslations("common");
  const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState<GalleryImage[]>(() =>
    club.gallery.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      imageKey: img.imageKey,
      altText: img.altText,
      sortOrder: img.sortOrder,
    }))
  );

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = useCallback(() => {
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
      throw new Error(data.error || t("failedToUploadImages"));
    }

    return response.json();
  }, [club.id, t]);

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
        setError(err instanceof Error ? err.message : t("failedToUploadImages"));
      } finally {
        setIsUploading(false);
        if (galleryInputRef.current) {
          galleryInputRef.current.value = "";
        }
      }
    },
    [gallery.length, uploadFile, t]
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
          throw new Error(t("failedToDeleteImage"));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("failedToDeleteImage"));
        return;
      }
    }

    // Revoke blob URL if exists
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }

    setGallery((prev) => prev.filter((_, i) => i !== index));
  }, [club.id, gallery, t]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/clubs/${club.id}/media`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        throw new Error(data.error || t("failedToUpdateMedia"));
      }

      // Get updated club data from response
      const updatedClub = await response.json();

      // Update store reactively - no page reload needed
      updateClubInStore(club.id, updatedClub);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToSaveChanges"));
    } finally {
      setIsSaving(false);
    }
  }, [gallery, club.id, updateClubInStore, t]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">{t("gallery")}</h2>
        <Tooltip
          content={disabled ? disabledTooltip : undefined}
          position="bottom"
        >
          <Button
            variant="outline"
            onClick={handleEdit}
            disabled={disabled}
          >
            {tCommon("edit")}
          </Button>
        </Tooltip>
      </div>

      <div className="im-section-view">
        <div className="im-gallery-view-hero">
          {isValidImageUrl(club.bannerData?.url) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={getImageUrl(club.bannerData?.url) ?? ""}
              alt={t("clubHeroAlt")}
              className="im-gallery-view-hero-img"
            />
          ) : (
            <div className="im-gallery-view-placeholder">{t("noHeroImage")}</div>
          )}
        </div>

        {club.gallery.length > 0 && (
          <div className="im-gallery-view-thumbnails">
            {club.gallery.map((img) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={img.id}
                src={getImageUrl(img.imageUrl) ?? ""}
                alt={img.altText || t("galleryImageAlt")}
                className="im-gallery-view-thumb"
              />
            ))}
          </div>
        )}
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title={t("editGallery")}
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <div className="im-gallery-edit-section">
          <div className="im-gallery-edit-section-header">
            <h3 className="im-gallery-edit-section-title">{t("galleryImages")}</h3>
            <Button
              type="button"
              variant="outline"
              onClick={() => galleryInputRef.current?.click()}
              disabled={isSaving || isUploading}
            >
              {isUploading ? t("uploading") : t("addImages")}
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
                    alt={img.altText || t("galleryImageIndexAlt", { index: index + 1 })}
                  />
                  <div className="im-gallery-edit-item-actions">
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
            <p className="im-section-view-value--empty">{t("noGalleryImages")}</p>
          )}
        </div>
      </SectionEditModal>
    </>
  );
}
