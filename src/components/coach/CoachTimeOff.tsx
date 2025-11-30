"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Modal, Input } from "@/components/ui";
import type { CoachTimeOffEntry } from "@/types/coach";
import "./CoachTimeOff.css";

interface CoachTimeOffProps {
  // coachId is passed for consistency with other coach components but not used
  // since the API uses the authenticated session to determine the coach
  coachId: string;
}

// Maximum number of past time off entries to display
const MAX_PAST_ENTRIES = 5;

// Format date for display
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Get today's date in YYYY-MM-DD format
function getTodayString(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="tm-timeoff-skeleton" aria-label="Loading time off entries">
      <div className="tm-timeoff-skeleton-row" />
      <div className="tm-timeoff-skeleton-row" />
      <div className="tm-timeoff-skeleton-row" />
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CoachTimeOff({ coachId }: CoachTimeOffProps) {
  const [timeOffs, setTimeOffs] = useState<CoachTimeOffEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CoachTimeOffEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: getTodayString(),
    isFullDay: true,
    startTime: "09:00",
    endTime: "17:00",
    reason: "",
  });

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTimeOffs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/coach/timeoff");

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch time off entries");
      }

      const data = await response.json();
      setTimeOffs(data.timeOffs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTimeOffs();
  }, [fetchTimeOffs]);

  const handleAddTimeOff = async () => {
    setIsSubmitting(true);
    try {
      const body: Record<string, string | undefined> = {
        date: formData.date,
        reason: formData.reason || undefined,
      };

      if (!formData.isFullDay) {
        body.startTime = formData.startTime;
        body.endTime = formData.endTime;
      }

      const response = await fetch("/api/coach/timeoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add time off");
      }

      showToast("Time off added successfully", "success");
      setIsAddModalOpen(false);
      resetForm();
      fetchTimeOffs();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add time off", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTimeOff = async () => {
    if (!selectedEntry) return;

    setIsSubmitting(true);
    try {
      const body: Record<string, string | null | undefined> = {
        date: formData.date,
        reason: formData.reason || null,
      };

      if (!formData.isFullDay) {
        body.startTime = formData.startTime;
        body.endTime = formData.endTime;
      } else {
        body.startTime = null;
        body.endTime = null;
      }

      const response = await fetch(`/api/coach/timeoff/${selectedEntry.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update time off");
      }

      showToast("Time off updated successfully", "success");
      setIsEditModalOpen(false);
      setSelectedEntry(null);
      resetForm();
      fetchTimeOffs();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update time off", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTimeOff = async () => {
    if (!selectedEntry) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/coach/timeoff/${selectedEntry.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete time off");
      }

      showToast("Time off deleted successfully", "success");
      setIsEditModalOpen(false);
      setSelectedEntry(null);
      resetForm();
      fetchTimeOffs();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete time off", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: getTodayString(),
      isFullDay: true,
      startTime: "09:00",
      endTime: "17:00",
      reason: "",
    });
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = (entry: CoachTimeOffEntry) => {
    setSelectedEntry(entry);
    setFormData({
      date: entry.date,
      isFullDay: !entry.startTime && !entry.endTime,
      startTime: entry.startTime || "09:00",
      endTime: entry.endTime || "17:00",
      reason: entry.reason || "",
    });
    setIsEditModalOpen(true);
  };

  // Group time offs by upcoming and past
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const upcomingTimeOffs = timeOffs.filter((t) => new Date(t.date + "T00:00:00") >= now);
  const pastTimeOffs = timeOffs.filter((t) => new Date(t.date + "T00:00:00") < now);

  if (isLoading) {
    return (
      <div className="tm-timeoff">
        <div className="tm-timeoff-container">
          <div className="tm-timeoff-header">
            <div>
              <h2 className="tm-timeoff-title">Time Off / Unavailable Days</h2>
              <p className="tm-timeoff-subtitle">Manage your blocked days and hours</p>
            </div>
          </div>
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tm-timeoff">
        <div className="tm-timeoff-container">
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={fetchTimeOffs}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tm-timeoff" data-testid="coach-timeoff">
      {/* Toast notification */}
      {toast && (
        <div role="alert" className={`tm-toast tm-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="tm-timeoff-container">
        <div className="tm-timeoff-header">
          <div>
            <h2 className="tm-timeoff-title">Time Off / Unavailable Days</h2>
            <p className="tm-timeoff-subtitle">Manage your blocked days and hours</p>
          </div>
          <div className="tm-timeoff-actions">
            <Button onClick={openAddModal}>+ Add Time Off</Button>
          </div>
        </div>

        {/* Upcoming Time Offs */}
        <div className="tm-timeoff-section">
          <h3 className="tm-timeoff-section-title">Upcoming</h3>
          {upcomingTimeOffs.length === 0 ? (
            <p className="tm-timeoff-empty">No upcoming time off scheduled.</p>
          ) : (
            <div className="tm-timeoff-list">
              {upcomingTimeOffs.map((entry) => (
                <button
                  key={entry.id}
                  className="tm-timeoff-item"
                  onClick={() => openEditModal(entry)}
                  aria-label={`Edit time off on ${formatDateForDisplay(entry.date)}`}
                >
                  <div className="tm-timeoff-item-content">
                    <div className="tm-timeoff-item-date">
                      {formatDateForDisplay(entry.date)}
                    </div>
                    <div className="tm-timeoff-item-time">
                      {entry.startTime && entry.endTime
                        ? `${entry.startTime} - ${entry.endTime}`
                        : "Full day"}
                    </div>
                    {entry.reason && (
                      <div className="tm-timeoff-item-reason">{entry.reason}</div>
                    )}
                  </div>
                  <div className="tm-timeoff-item-badge tm-timeoff-item-badge--upcoming">
                    Upcoming
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Past Time Offs */}
        {pastTimeOffs.length > 0 && (
          <div className="tm-timeoff-section">
            <h3 className="tm-timeoff-section-title">Past</h3>
            <div className="tm-timeoff-list">
              {pastTimeOffs.slice(0, MAX_PAST_ENTRIES).map((entry) => (
                <div key={entry.id} className="tm-timeoff-item tm-timeoff-item--past">
                  <div className="tm-timeoff-item-content">
                    <div className="tm-timeoff-item-date">
                      {formatDateForDisplay(entry.date)}
                    </div>
                    <div className="tm-timeoff-item-time">
                      {entry.startTime && entry.endTime
                        ? `${entry.startTime} - ${entry.endTime}`
                        : "Full day"}
                    </div>
                    {entry.reason && (
                      <div className="tm-timeoff-item-reason">{entry.reason}</div>
                    )}
                  </div>
                  <div className="tm-timeoff-item-badge tm-timeoff-item-badge--past">
                    Past
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Time Off Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add Time Off"
      >
        <form
          className="tm-timeoff-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTimeOff();
          }}
        >
          <Input
            label="Date"
            id="add-date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <div className="tm-timeoff-modal-checkbox">
            <label className="tm-timeoff-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isFullDay}
                onChange={(e) => setFormData({ ...formData, isFullDay: e.target.checked })}
                className="tm-timeoff-checkbox"
              />
              <span>Full day</span>
            </label>
          </div>

          {!formData.isFullDay && (
            <div className="tm-timeoff-modal-row">
              <Input
                label="Start Time"
                id="add-start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
              <Input
                label="End Time"
                id="add-end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          )}

          <Input
            label="Reason (optional)"
            id="add-reason"
            type="text"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="e.g., Vacation, Doctor appointment"
          />

          <div className="tm-timeoff-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Time Off"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Time Off Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedEntry(null);
          resetForm();
        }}
        title="Edit Time Off"
      >
        <form
          className="tm-timeoff-modal-form"
          onSubmit={(e) => {
            e.preventDefault();
            handleUpdateTimeOff();
          }}
        >
          <Input
            label="Date"
            id="edit-date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />

          <div className="tm-timeoff-modal-checkbox">
            <label className="tm-timeoff-checkbox-label">
              <input
                type="checkbox"
                checked={formData.isFullDay}
                onChange={(e) => setFormData({ ...formData, isFullDay: e.target.checked })}
                className="tm-timeoff-checkbox"
              />
              <span>Full day</span>
            </label>
          </div>

          {!formData.isFullDay && (
            <div className="tm-timeoff-modal-row">
              <Input
                label="Start Time"
                id="edit-start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
              <Input
                label="End Time"
                id="edit-end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          )}

          <Input
            label="Reason (optional)"
            id="edit-reason"
            type="text"
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="e.g., Vacation, Doctor appointment"
          />

          <div className="tm-timeoff-modal-actions">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteTimeOff}
              disabled={isSubmitting}
              className="mr-auto text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedEntry(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
