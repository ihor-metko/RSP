"use client";

import { useState, useCallback } from "react";
import { Button, Input } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { isValidImageUrl, getSupabaseStorageUrl } from "@/utils/image";
import type { ClubDetail } from "@/types/club";
import "./ClubHeaderView.css";

interface ClubHeaderViewProps {
  club: ClubDetail;
  onUpdate: (payload: {
    name: string;
    slug: string;
    shortDescription: string;
    isPublic: boolean;
  }) => Promise<unknown>;
}

export function ClubHeaderView({ club, onUpdate }: ClubHeaderViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: club.name,
    slug: club.slug || "",
    shortDescription: club.shortDescription || "",
    isPublic: club.isPublic,
  });

  const handleEdit = useCallback(() => {
    setFormData({
      name: club.name,
      slug: club.slug || "",
      shortDescription: club.shortDescription || "",
      isPublic: club.isPublic,
    });
    setError("");
    setIsEditing(true);
  }, [club]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    if (!formData.name.trim()) {
      setError("Club name is required");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      await onUpdate(formData);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [formData, onUpdate]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">Club Header</h2>
        <Button
          variant="outline"
          onClick={handleEdit}
          className="im-section-edit-btn"
        >
          Edit
        </Button>
      </div>

      <div className="im-section-view">
        <div className="im-header-view-content">
          {isValidImageUrl(club.logo) && (
            <div className="im-header-view-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getSupabaseStorageUrl(club.logo) ?? ""} alt={`${club.name} logo`} />
            </div>
          )}
          <div className="im-header-view-info">
            <div className="im-section-view-row">
              <span className="im-section-view-label">Name:</span>
              <span className="im-section-view-value">{club.name}</span>
            </div>
            <div className="im-section-view-row">
              <span className="im-section-view-label">Slug:</span>
              <span
                className={`im-section-view-value ${
                  !club.slug ? "im-section-view-value--empty" : ""
                }`}
              >
                {club.slug || "Not set"}
              </span>
            </div>
            <div className="im-section-view-row">
              <span className="im-section-view-label">Description:</span>
              <span
                className={`im-section-view-value ${
                  !club.shortDescription ? "im-section-view-value--empty" : ""
                }`}
              >
                {club.shortDescription || "Not set"}
              </span>
            </div>
            <div className="im-section-view-row">
              <span className="im-section-view-label">Status:</span>
              <span
                className={`im-status-badge ${
                  club.isPublic
                    ? "im-status-badge--published"
                    : "im-status-badge--unpublished"
                }`}
              >
                {club.isPublic ? "Published" : "Unpublished"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title="Edit Club Header"
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}
        <Input
          label="Club Name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="Enter club name"
          required
          disabled={isSaving}
        />
        <Input
          label="Slug (URL identifier)"
          name="slug"
          value={formData.slug}
          onChange={handleInputChange}
          placeholder="club-name-slug"
          disabled={isSaving}
        />
        <div className="rsp-input-wrapper">
          <label className="rsp-label mb-1 block text-sm font-medium">
            Short Description
          </label>
          <textarea
            name="shortDescription"
            value={formData.shortDescription}
            onChange={handleInputChange}
            placeholder="Brief description of the club"
            className="rsp-input"
            rows={3}
            disabled={isSaving}
          />
        </div>
        <div className="rsp-input-wrapper flex items-center gap-2">
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleInputChange}
            disabled={isSaving}
            className="h-4 w-4 rounded-sm border-gray-300 focus:ring-2"
          />
          <label htmlFor="isPublic" className="rsp-label text-sm font-medium">
            Publish club (visible to public)
          </label>
        </div>
      </SectionEditModal>
    </>
  );
}
