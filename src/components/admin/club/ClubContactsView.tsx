"use client";

import { useState, useCallback } from "react";
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
  const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    location: club.location,
    city: club.city || "",
    country: club.country || "",
    latitude: club.latitude?.toString() || "",
    longitude: club.longitude?.toString() || "",
    phone: club.phone || "",
    email: club.email || "",
    website: club.website || "",
  });

  const handleEdit = useCallback(() => {
    setFormData({
      location: club.location,
      city: club.city || "",
      country: club.country || "",
      latitude: club.latitude?.toString() || "",
      longitude: club.longitude?.toString() || "",
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
    if (!formData.location.trim()) {
      setError("Address is required");
      return;
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Invalid email format");
      return;
    }

    // Validate coordinates if provided
    if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
      setError("Latitude must be a valid number");
      return;
    }
    if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
      setError("Longitude must be a valid number");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      // Update both location and contacts in parallel
      const [locationResponse, contactsResponse] = await Promise.all([
        fetch(`/api/admin/clubs/${club.id}/location`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: formData.location.trim(),
            city: formData.city.trim() || null,
            country: formData.country.trim() || null,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          }),
        }),
        fetch(`/api/admin/clubs/${club.id}/contacts`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: formData.phone.trim() || null,
            email: formData.email.trim() || null,
            website: formData.website.trim() || null,
          }),
        }),
      ]);

      if (!locationResponse.ok) {
        const data = await locationResponse.json();
        throw new Error(data.error || "Failed to update location");
      }

      if (!contactsResponse.ok) {
        const data = await contactsResponse.json();
        throw new Error(data.error || "Failed to update contacts");
      }

      // Get updated club data from either response (both return full club)
      const updatedClub = await contactsResponse.json();

      // Update store reactively - no page reload needed
      updateClubInStore(club.id, updatedClub);

      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [formData, club.id, updateClubInStore]);

  const hasCoordinates = club.latitude && club.longitude;

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">Contact Information</h2>
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
        <div className="im-section-view-row">
          <span className="im-section-view-label">Address:</span>
          <span className="im-section-view-value">{club.location}</span>
        </div>
        {(club.city || club.country) && (
          <div className="im-section-view-row">
            <span className="im-section-view-label">City/Country:</span>
            <span className="im-section-view-value">
              {[club.city, club.country].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
        <div className="im-section-view-row">
          <span className="im-section-view-label">Phone:</span>
          <span
            className={`im-section-view-value ${!club.phone ? "im-section-view-value--empty" : ""
              }`}
          >
            {club.phone || "Not set"}
          </span>
        </div>
        <div className="im-section-view-row">
          <span className="im-section-view-label">Email:</span>
          <span
            className={`im-section-view-value ${!club.email ? "im-section-view-value--empty" : ""
              }`}
          >
            {club.email || "Not set"}
          </span>
        </div>
        <div className="im-section-view-row">
          <span className="im-section-view-label">Website:</span>
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
              "Not set"
            )}
          </span>
        </div>
        {hasCoordinates && (
          <div className="im-contacts-view-map">
            <span className="im-section-view-label">Coordinates:</span>
            <span className="im-section-view-value">
              {club.latitude}, {club.longitude}
            </span>
          </div>
        )}
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title="Edit Contact Information"
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}
        <Input
          label="Address"
          name="location"
          value={formData.location}
          onChange={handleInputChange}
          placeholder="Full address"
          required
          disabled={isSaving}
        />
        <div className="im-section-edit-modal-row">
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="City"
            disabled={isSaving}
          />
          <Input
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleInputChange}
            placeholder="Country"
            disabled={isSaving}
          />
        </div>
        <div className="im-section-edit-modal-row">
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+1 (555) 123-4567"
            disabled={isSaving}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="contact@club.com"
            disabled={isSaving}
          />
        </div>
        <Input
          label="Website"
          name="website"
          value={formData.website}
          onChange={handleInputChange}
          placeholder="https://www.club.com"
          disabled={isSaving}
        />
        <div className="im-section-edit-modal-row">
          <Input
            label="Latitude"
            name="latitude"
            value={formData.latitude}
            onChange={handleInputChange}
            placeholder="e.g., 40.7128"
            disabled={isSaving}
          />
          <Input
            label="Longitude"
            name="longitude"
            value={formData.longitude}
            onChange={handleInputChange}
            placeholder="e.g., -74.0060"
            disabled={isSaving}
          />
        </div>
      </SectionEditModal>
    </>
  );
}
