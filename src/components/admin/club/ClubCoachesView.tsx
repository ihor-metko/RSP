"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Input } from "@/components/ui";
import { SectionEditModal } from "./SectionEditModal";
import type { ClubDetail } from "@/types/club";
import "./ClubCoachesView.css";

interface AvailableCoach {
  id: string;
  userId: string;
  bio: string | null;
  phone: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface ClubCoachesViewProps {
  club: ClubDetail;
  onUpdate?: (payload: { coachIds: string[] }) => Promise<unknown>;
}

export function ClubCoachesView({ club, onUpdate }: ClubCoachesViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableCoaches, setAvailableCoaches] = useState<AvailableCoach[]>([]);
  const [selectedCoachIds, setSelectedCoachIds] = useState<string[]>([]);

  const fetchAvailableCoaches = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch all coaches (including those not assigned to any club)
      const response = await fetch("/api/coaches");
      if (!response.ok) {
        throw new Error("Failed to fetch coaches");
      }
      const data = await response.json();
      setAvailableCoaches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load coaches");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isEditing) {
      fetchAvailableCoaches();
    }
  }, [isEditing, fetchAvailableCoaches]);

  const handleEdit = useCallback(() => {
    setSelectedCoachIds(club.coaches.map((c) => c.id));
    setSearchQuery("");
    setError("");
    setIsEditing(true);
  }, [club.coaches]);

  const handleClose = useCallback(() => {
    setIsEditing(false);
    setError("");
    setSearchQuery("");
  }, []);

  const handleToggleCoach = useCallback((coachId: string) => {
    setSelectedCoachIds((prev) =>
      prev.includes(coachId)
        ? prev.filter((id) => id !== coachId)
        : [...prev, coachId]
    );
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setError("");
    try {
      if (onUpdate) {
        await onUpdate({ coachIds: selectedCoachIds });
      setIsEditing(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  }, [selectedCoachIds, onUpdate]);

  const filteredCoaches = availableCoaches.filter((coach) => {
    const query = searchQuery.toLowerCase();
    return (
      coach.user.name?.toLowerCase().includes(query) ||
      coach.user.email.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <div className="im-section-view-header">
        <h2 className="im-club-view-section-title">Coaches</h2>
        <Button
          variant="outline"
          onClick={handleEdit}
          className="im-section-edit-btn"
        >
          Edit
        </Button>
      </div>

      <div className="im-section-view">
        {club.coaches.length > 0 ? (
          <div className="im-coaches-view-list">
            {club.coaches.map((coach) => (
              <div key={coach.id} className="im-coaches-view-item">
                <div className="im-coaches-view-avatar">
                  {coach.user.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={coach.user.image} alt={coach.user.name || "Coach"} />
                  ) : (
                    <span className="im-coaches-view-avatar-placeholder">
                      {(coach.user.name || coach.user.email)[0].toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="im-coaches-view-info">
                  <span className="im-coaches-view-name">
                    {coach.user.name || "Unknown"}
                  </span>
                  <span className="im-coaches-view-email">{coach.user.email}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="im-section-view-value--empty">No coaches assigned</p>
        )}
      </div>

      <SectionEditModal
        isOpen={isEditing}
        onClose={handleClose}
        title="Edit Coaches"
        onSave={handleSave}
        isSaving={isSaving}
      >
        {error && <div className="im-section-edit-modal-error">{error}</div>}

        <Input
          placeholder="Search coaches by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLoading || isSaving}
        />

        <div className="im-coaches-edit-list">
          {isLoading ? (
            <p className="im-coaches-edit-loading">Loading coaches...</p>
          ) : filteredCoaches.length > 0 ? (
            filteredCoaches.map((coach) => (
              <label key={coach.id} className="im-coaches-edit-item">
                <input
                  type="checkbox"
                  checked={selectedCoachIds.includes(coach.id)}
                  onChange={() => handleToggleCoach(coach.id)}
                  disabled={isSaving}
                />
                <div className="im-coaches-edit-item-info">
                  <div className="im-coaches-view-avatar im-coaches-view-avatar--small">
                    {coach.user.image ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={coach.user.image} alt={coach.user.name || "Coach"} />
                    ) : (
                      <span className="im-coaches-view-avatar-placeholder">
                        {(coach.user.name || coach.user.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="im-coaches-view-name">
                      {coach.user.name || "Unknown"}
                    </span>
                    <span className="im-coaches-view-email">{coach.user.email}</span>
                  </div>
                </div>
              </label>
            ))
          ) : (
            <p className="im-section-view-value--empty">
              {searchQuery
                ? "No coaches found matching your search"
                : "No coaches available"}
            </p>
          )}
        </div>

        <p className="im-coaches-edit-hint">
          {selectedCoachIds.length} coach{selectedCoachIds.length !== 1 ? "es" : ""}{" "}
          selected
        </p>
      </SectionEditModal>
    </>
  );
}
