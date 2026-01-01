"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Input, Tooltip } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { ClubDetail } from "@/types/club";
import "./ClubContactsView.css";

interface ClubContactsViewProps {
  club: ClubDetail;
  disabled?: boolean;
  disabledTooltip?: string;
}

export function ClubContactsView({ club, disabled = false, disabledTooltip }: ClubContactsViewProps) {
  const t = useTranslations("clubDetail");
  const tCommon = useTranslations("common");
  const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    phone: club.phone || "",
    email: club.email || "",
    website: club.website || "",
  });

  const handleEdit = useCallback(() => {
    setFormData({
      phone: club.phone || "",
      email: club.email || "",
      website: club.website || "",
    });
    setError("");
    setIsEditing(true);
  }, [club]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError(t("invalidEmailFormat"));
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const contactsResponse = await fetch(`/api/admin/clubs/${club.id}/contacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          website: formData.website.trim() || null,
        }),
      });

      if (!contactsResponse.ok) {
        const data = await contactsResponse.json();
        throw new Error(data.error || t("failedToUpdateContacts"));
      }

      // Get updated club data from response
      const updatedClub = await contactsResponse.json();

      // Update store reactively - no page reload needed
      updateClubInStore(club.id, updatedClub);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToSaveChanges"));
    } finally {
      setIsSaving(false);
    }
  }, [formData, club.id, updateClubInStore, t]);

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">{t("contactInformation")}</h2>
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
        <div className="im-section-view-row">
          <span className="im-section-view-label">{t("phone")}:</span>
          <span
            className={`im-section-view-value ${!club.phone ? "im-section-view-value--empty" : ""
              }`}
          >
            {club.phone || t("notSet")}
          </span>
        </div>
        <div className="im-section-view-row">
          <span className="im-section-view-label">{t("email")}:</span>
          <span
            className={`im-section-view-value ${!club.email ? "im-section-view-value--empty" : ""
              }`}
          >
            {club.email || t("notSet")}
          </span>
        </div>
        <div className="im-section-view-row">
          <span className="im-section-view-label">{t("website")}:</span>
          <span
            className={`im-section-view-value ${!club.website ? "im-section-view-value--empty" : ""
              }`}
          >
            {club.website ? (
              <a
                href={club.website}
                target="_blank"
                rel="noopener noreferrer"
                className="im-contacts-view-link"
              >
                {club.website}
              </a>
            ) : (
              t("notSet")
            )}
          </span>
        </div>
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title={t("editContactInformation")}
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}
        <div className="im-section-edit-modal-row">
          <Input
            label={t("phone")}
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+1 (555) 123-4567"
            disabled={isSaving}
          />
          <Input
            label={t("email")}
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="contact@club.com"
            disabled={isSaving}
          />
        </div>
        <Input
          label={t("website")}
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          placeholder="https://www.club.com"
          disabled={isSaving}
        />
      </SectionEditModal>
    </>
  );
}
