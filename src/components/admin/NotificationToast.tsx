"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import "./NotificationToast.css";

interface NotificationToastProps {
  id: string;
  type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED" | "BOOKING_CREATED" | "BOOKING_UPDATED" | "BOOKING_CANCELLED" | "PAYMENT_CONFIRMED" | "PAYMENT_FAILED";
  summary: string;
  onView: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
}

function getToastIcon(type: string): string {
  switch (type) {
    case "REQUESTED":
      return "📩";
    case "ACCEPTED":
      return "✅";
    case "DECLINED":
      return "❌";
    case "CANCELED":
      return "🚫";
    case "BOOKING_CREATED":
      return "📅";
    case "BOOKING_UPDATED":
      return "📝";
    case "BOOKING_CANCELLED":
      return "🚫";
    case "PAYMENT_CONFIRMED":
      return "💳";
    case "PAYMENT_FAILED":
      return "❌";
    default:
      return "🔔";
  }
}

export function NotificationToast({
  type,
  summary,
  onView,
  onDismiss,
  autoDismissMs = 6000,
}: NotificationToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onDismiss, 300); // Allow animation to complete
    }, autoDismissMs);

    return () => clearTimeout(timeout);
  }, [autoDismissMs, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  const handleView = () => {
    onView();
    handleDismiss();
  };

  return (
    <div
      className={`tm-notification-toast ${isExiting ? "tm-notification-toast--exiting" : ""}`}
      role="alert"
      aria-live="polite"
    >
      <div className="tm-notification-toast-icon">{getToastIcon(type)}</div>
      <div className="tm-notification-toast-content">
        <div className="tm-notification-toast-summary">{summary}</div>
        <div className="tm-notification-toast-actions">
          <Button variant="primary" onClick={handleView} className="tm-toast-view-btn">
            View
          </Button>
          <button
            className="tm-toast-dismiss-btn"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: "REQUESTED" | "ACCEPTED" | "DECLINED" | "CANCELED" | "BOOKING_CREATED" | "BOOKING_UPDATED" | "BOOKING_CANCELLED" | "PAYMENT_CONFIRMED" | "PAYMENT_FAILED";
    summary: string;
  }>;
  onView: (id: string) => void;
  onDismiss: (id: string) => void;
}

export function NotificationToastContainer({
  toasts,
  onView,
  onDismiss,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="tm-notification-toast-container" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <NotificationToast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          summary={toast.summary}
          onView={() => onView(toast.id)}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  );
}
