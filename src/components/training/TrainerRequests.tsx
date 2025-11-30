"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Modal } from "@/components/ui";
import "./TrainerRequests.css";

interface TrainingRequest {
  id: string;
  trainerId: string;
  trainerName: string;
  playerId: string;
  playerName: string;
  playerEmail: string;
  clubId: string;
  clubName: string;
  date: string;
  time: string;
  comment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

type FilterStatus = "all" | "pending" | "confirmed" | "rejected" | "cancelled";

interface TrainerRequestsProps {
  onRefresh?: () => void;
}

function formatDateDisplay(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TrainerRequests({ onRefresh }: TrainerRequestsProps) {
  const [requests, setRequests] = useState<TrainingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<TrainingRequest | null>(null);
  const [actionType, setActionType] = useState<"confirm" | "reject" | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = filterStatus === "all"
        ? "/api/trainer/requests"
        : `/api/trainer/requests?status=${filterStatus}`;

      const response = await fetch(url);

      if (response.status === 401) {
        setError("Please sign in to view training requests");
        return;
      }

      if (response.status === 403) {
        setError("Access denied. Only trainers can view this page.");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch requests");
      }

      const data = await response.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAction = async (requestId: string, action: "confirm" | "reject") => {
    setProcessingId(requestId);
    try {
      const response = await fetch(`/api/trainer/requests/${requestId}/${action}`, {
        method: "PUT",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} request`);
      }

      showToast(
        action === "confirm"
          ? "Training request confirmed!"
          : "Training request rejected",
        "success"
      );

      // Refresh the list
      fetchRequests();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : `Failed to ${action} request`, "error");
    } finally {
      setProcessingId(null);
      setConfirmModalOpen(false);
      setSelectedRequest(null);
      setActionType(null);
    }
  };

  const openConfirmModal = (request: TrainingRequest, action: "confirm" | "reject") => {
    setSelectedRequest(request);
    setActionType(action);
    setConfirmModalOpen(true);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending":
        return "tm-request-status--pending";
      case "confirmed":
        return "tm-request-status--confirmed";
      case "rejected":
        return "tm-request-status--rejected";
      case "cancelled":
        return "tm-request-status--cancelled";
      default:
        return "";
    }
  };

  // Filter requests based on current view
  const filteredRequests = showHistory
    ? requests.filter((r) => r.status !== "pending")
    : requests.filter((r) => r.status === "pending");

  // Get count of pending requests
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="tm-trainer-requests">
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

      {/* Filter and View Toggle */}
      <div className="tm-requests-controls">
        <div className="tm-view-toggle">
          <button
            onClick={() => setShowHistory(false)}
            className={`tm-toggle-button ${!showHistory ? "tm-toggle-button--active" : ""}`}
            aria-pressed={!showHistory}
          >
            Pending Requests {pendingCount > 0 && <span className="tm-badge">{pendingCount}</span>}
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`tm-toggle-button ${showHistory ? "tm-toggle-button--active" : ""}`}
            aria-pressed={showHistory}
          >
            History
          </button>
        </div>

        {showHistory && (
          <div className="tm-filter-controls">
            <label htmlFor="status-filter" className="tm-filter-label">
              Filter by status:
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="tm-filter-select"
            >
              <option value="all">All</option>
              <option value="confirmed">Confirmed</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="tm-error" role="alert">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="tm-loading">
          <div className="tm-loading-spinner"></div>
          Loading requests...
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredRequests.length === 0 && (
        <Card className="tm-empty-state">
          <p>
            {showHistory
              ? "No past requests found."
              : "No pending requests at the moment."}
          </p>
        </Card>
      )}

      {/* Request List */}
      {!loading && !error && filteredRequests.length > 0 && (
        <div className="tm-requests-list">
          {filteredRequests.map((request) => (
            <Card key={request.id} className="tm-request-card">
              <div className="tm-request-header">
                <div className="tm-request-player">
                  <span className="tm-player-name">{request.playerName}</span>
                  <span className="tm-player-email">{request.playerEmail}</span>
                </div>
                <span className={`tm-request-status ${getStatusClass(request.status)}`}>
                  {request.status}
                </span>
              </div>

              <div className="tm-request-details">
                <div className="tm-detail-row">
                  <span className="tm-detail-label">Date:</span>
                  <span className="tm-detail-value">{formatDateDisplay(request.date)}</span>
                </div>
                <div className="tm-detail-row">
                  <span className="tm-detail-label">Time:</span>
                  <span className="tm-detail-value">{request.time}</span>
                </div>
                <div className="tm-detail-row">
                  <span className="tm-detail-label">Club:</span>
                  <span className="tm-detail-value">{request.clubName}</span>
                </div>
                {request.comment && (
                  <div className="tm-detail-row tm-detail-row--comment">
                    <span className="tm-detail-label">Notes:</span>
                    <span className="tm-detail-value">{request.comment}</span>
                  </div>
                )}
              </div>

              {/* Actions - only for pending requests */}
              {request.status === "pending" && (
                <div className="tm-request-actions">
                  <Button
                    onClick={() => openConfirmModal(request, "confirm")}
                    disabled={processingId === request.id}
                    className="tm-action-confirm"
                  >
                    {processingId === request.id ? "Processing..." : "Confirm"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openConfirmModal(request, "reject")}
                    disabled={processingId === request.id}
                    className="tm-action-reject"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedRequest(null);
          setActionType(null);
        }}
        title={actionType === "confirm" ? "Confirm Training Request" : "Reject Training Request"}
      >
        {selectedRequest && (
          <div className="tm-confirm-modal-content">
            <p>
              {actionType === "confirm"
                ? `Are you sure you want to confirm this training session with ${selectedRequest.playerName}?`
                : `Are you sure you want to reject this training request from ${selectedRequest.playerName}?`}
            </p>
            <div className="tm-confirm-details">
              <p><strong>Date:</strong> {formatDateDisplay(selectedRequest.date)}</p>
              <p><strong>Time:</strong> {selectedRequest.time}</p>
              <p><strong>Club:</strong> {selectedRequest.clubName}</p>
            </div>
            <div className="tm-confirm-actions">
              <Button
                variant="outline"
                onClick={() => {
                  setConfirmModalOpen(false);
                  setSelectedRequest(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleAction(selectedRequest.id, actionType!)}
                disabled={processingId === selectedRequest.id}
                className={actionType === "reject" ? "tm-action-reject-modal" : ""}
              >
                {processingId === selectedRequest.id
                  ? "Processing..."
                  : actionType === "confirm"
                  ? "Confirm"
                  : "Reject"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
