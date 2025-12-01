"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Modal, Select } from "@/components/ui";
import "./TrainingHistory.css";

interface TrainingRequest {
  id: string;
  trainerId: string;
  trainerName: string;
  playerId: string;
  clubId: string;
  clubName: string;
  courtId: string | null;
  courtName: string | null;
  bookingId: string | null;
  date: string;
  time: string;
  comment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = "all" | "pending" | "confirmed" | "rejected" | "cancelled" | "cancelled_by_player";

// Helper function to format date for display
function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TrainingHistory() {
  const t = useTranslations("training.history");
  const tCommon = useTranslations("training");
  const [trainings, setTrainings] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [selectedTraining, setSelectedTraining] = useState<TrainingRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchTrainings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }

      const url = `/api/trainings${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 401) {
          setError("Please sign in to view your trainings");
          return;
        }
        throw new Error("Failed to fetch trainings");
      }

      const data = await response.json();
      setTrainings(data.trainings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorLoading"));
    } finally {
      setLoading(false);
    }
  }, [filterStatus, t]);

  const handleCancelRequest = useCallback(async (trainingId: string) => {
    setCancellingId(trainingId);
    try {
      const response = await fetch(`/api/trainings/${trainingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled_by_player" }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel request");
      }

      showToast(tCommon("requestCancelled"), "success");
      fetchTrainings();
      
      // Close modal if it's open for this training
      if (selectedTraining?.id === trainingId) {
        setIsModalOpen(false);
        setSelectedTraining(null);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to cancel request", "error");
    } finally {
      setCancellingId(null);
    }
  }, [fetchTrainings, showToast, tCommon, selectedTraining]);

  useEffect(() => {
    fetchTrainings();
  }, [fetchTrainings]);

  // Set up polling for real-time updates (every 60 seconds to reduce server load)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTrainings();
    }, 60000); // Poll every 60 seconds

    return () => clearInterval(interval);
  }, [fetchTrainings]);

  const handleTrainingClick = (training: TrainingRequest) => {
    setSelectedTraining(training);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTraining(null);
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case "pending":
        return "tm-training-status--pending";
      case "confirmed":
        return "tm-training-status--confirmed";
      case "rejected":
        return "tm-training-status--rejected";
      case "cancelled":
      case "cancelled_by_player":
        return "tm-training-status--cancelled";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case "pending":
        return t("pending");
      case "confirmed":
        return t("confirmed");
      case "rejected":
        return t("rejected");
      case "cancelled":
        return t("cancelled");
      case "cancelled_by_player":
        return t("cancelledByPlayer");
      default:
        return status;
    }
  };

  const getStatusMessage = (status: string): { message: string; className: string } => {
    switch (status) {
      case "pending":
        return {
          message: t("statusPending"),
          className: "tm-training-modal-status-message--pending",
        };
      case "confirmed":
        return {
          message: t("statusConfirmed"),
          className: "tm-training-modal-status-message--confirmed",
        };
      case "rejected":
        return {
          message: t("statusRejected"),
          className: "tm-training-modal-status-message--rejected",
        };
      case "cancelled":
        return {
          message: t("statusCancelled"),
          className: "tm-training-modal-status-message--cancelled",
        };
      case "cancelled_by_player":
        return {
          message: t("statusCancelledByPlayer"),
          className: "tm-training-modal-status-message--cancelled",
        };
      default:
        return { message: "", className: "" };
    }
  };

  const getCourtLabel = (training: TrainingRequest): string => {
    if (!training.courtId || !training.courtName) {
      return t("noCourt");
    }
    if (training.status === "confirmed") {
      return t("courtConfirmed");
    }
    return t("courtReserved");
  };

  return (
    <div className="tm-training-history">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          aria-live="polite"
          className={`tm-toast ${
            toast.type === "success" ? "tm-toast--success" : "tm-toast--error"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Filter Controls */}
      <div className="tm-training-controls">
        <div className="tm-filter-group">
          <Select
            id="status-filter"
            label={`${t("filterByStatus")}:`}
            options={[
              { value: "all", label: t("allStatuses") },
              { value: "pending", label: t("pending") },
              { value: "confirmed", label: t("confirmed") },
              { value: "rejected", label: t("rejected") },
              { value: "cancelled", label: t("cancelled") },
              { value: "cancelled_by_player", label: t("cancelledByPlayer") },
            ]}
            value={filterStatus}
            onChange={(value) => setFilterStatus(value as FilterStatus)}
            className="tm-filter-select"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="tm-training-loading">
          <div className="tm-loading-spinner" />
          <span>{t("loading")}</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="tm-training-error" role="alert">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && trainings.length === 0 && (
        <Card className="tm-training-empty">
          <p>{t("noTrainings")}</p>
        </Card>
      )}

      {/* Training List */}
      {!loading && !error && trainings.length > 0 && (
        <div className="tm-training-list">
          {trainings.map((training) => (
            <div
              key={training.id}
              className="tm-training-card"
              onClick={() => handleTrainingClick(training)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleTrainingClick(training);
                }
              }}
              aria-label={`${t("viewDetails")}: ${training.trainerName} - ${formatDateDisplay(training.date)}`}
            >
              <div className="tm-training-card-header">
                <span className="tm-training-trainer-name">{training.trainerName}</span>
                <span className={`tm-training-status ${getStatusClass(training.status)}`}>
                  {getStatusLabel(training.status)}
                </span>
              </div>

              <div className="tm-training-card-details">
                <div className="tm-training-detail-row">
                  <span className="tm-training-detail-label">{t("dateTime")}:</span>
                  <span className="tm-training-detail-value">
                    {formatDateDisplay(training.date)} {training.time}
                  </span>
                </div>
                <div className="tm-training-detail-row">
                  <span className="tm-training-detail-label">{t("club")}:</span>
                  <span className="tm-training-detail-value">{training.clubName}</span>
                </div>
              </div>

              {training.courtName && (
                <div className="tm-training-court-info">
                  <span className="tm-training-court-badge">
                    🏟️ {training.courtName}
                  </span>
                </div>
              )}

              {/* Cancel Button - only for pending trainings */}
              {training.status === "pending" && (
                <div className="tm-training-card-actions">
                  <Button
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelRequest(training.id);
                    }}
                    disabled={cancellingId === training.id}
                    className="tm-cancel-button"
                  >
                    {cancellingId === training.id ? tCommon("cancelling") : tCommon("cancelRequest")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Training Details Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={t("trainingDetails")}>
        {selectedTraining && (
          <div className="tm-training-modal-content">
            {/* Status Message */}
            <div
              className={`tm-training-modal-status-message ${
                getStatusMessage(selectedTraining.status).className
              }`}
            >
              {getStatusMessage(selectedTraining.status).message}
            </div>

            {/* Training Info */}
            <div className="tm-training-modal-section">
              <span className="tm-training-modal-label">{t("trainer")}</span>
              <p className="tm-training-modal-value">{selectedTraining.trainerName}</p>
            </div>

            <div className="tm-training-modal-section">
              <span className="tm-training-modal-label">{t("dateTime")}</span>
              <p className="tm-training-modal-value">
                {formatDateDisplay(selectedTraining.date)} at {selectedTraining.time}
              </p>
            </div>

            <div className="tm-training-modal-section">
              <span className="tm-training-modal-label">{t("club")}</span>
              <p className="tm-training-modal-value">{selectedTraining.clubName}</p>
            </div>

            <div className="tm-training-modal-section">
              <span className="tm-training-modal-label">{t("court")}</span>
              <p className="tm-training-modal-value">
                {selectedTraining.courtName ? (
                  <>
                    {selectedTraining.courtName}
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                      ({getCourtLabel(selectedTraining)})
                    </span>
                  </>
                ) : (
                  t("noCourt")
                )}
              </p>
            </div>

            {/* Comment */}
            <div className="tm-training-modal-section">
              <span className="tm-training-modal-label">{t("yourComment")}</span>
              {selectedTraining.comment ? (
                <p className="tm-training-modal-comment">&ldquo;{selectedTraining.comment}&rdquo;</p>
              ) : (
                <p className="tm-training-modal-value text-gray-400 dark:text-gray-500 italic">
                  {t("noComment")}
                </p>
              )}
            </div>

            {/* Timestamps */}
            <div className="tm-training-modal-section text-sm text-gray-500 dark:text-gray-400">
              <p>
                {t("requestedOn")}: {formatDateTime(selectedTraining.createdAt)}
              </p>
              <p>
                {t("lastUpdated")}: {formatDateTime(selectedTraining.updatedAt)}
              </p>
            </div>

            {/* Cancel Button in Modal - only for pending trainings */}
            {selectedTraining.status === "pending" && (
              <div className="tm-training-modal-actions">
                <Button
                  variant="outline"
                  onClick={() => handleCancelRequest(selectedTraining.id)}
                  disabled={cancellingId === selectedTraining.id}
                  className="tm-cancel-button"
                >
                  {cancellingId === selectedTraining.id ? tCommon("cancelling") : tCommon("cancelRequest")}
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
