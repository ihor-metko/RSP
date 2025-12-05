"use client";

import { useEffect, useState } from "react";
import "./Toast.css";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  /** The message to display */
  message: string;
  /** The type of toast */
  type?: ToastType;
  /** Duration in milliseconds before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;
  /** Callback when toast is dismissed */
  onDismiss?: () => void;
  /** Whether to show close button */
  showClose?: boolean;
  /** Additional CSS classes */
  className?: string;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: (
    <svg className="im-toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="im-toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="im-toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="im-toast-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
    </svg>
  ),
};

/**
 * Toast Component
 * 
 * A notification toast component for displaying feedback messages.
 * Supports auto-dismiss and different variants.
 * 
 * @example
 * // Basic usage
 * <Toast message="Operation successful!" type="success" />
 * 
 * @example
 * // With manual dismiss
 * <Toast 
 *   message="Error occurred" 
 *   type="error" 
 *   showClose 
 *   onDismiss={() => setVisible(false)} 
 * />
 */
export function Toast({
  message,
  type = "info",
  duration = 5000,
  onDismiss,
  showClose = true,
  className = "",
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onDismiss?.();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`im-toast im-toast--${type} ${isLeaving ? "im-toast--leaving" : ""} ${className}`.trim()}
      role="alert"
      aria-live="polite"
    >
      {iconMap[type]}
      <span className="im-toast-message">{message}</span>
      {showClose && (
        <button
          type="button"
          className="im-toast-close"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      )}
    </div>
  );
}

/* Toast Container for managing multiple toasts */
export interface ToastContainerProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

export function ToastContainer({
  children,
  position = "top-right",
}: ToastContainerProps) {
  return (
    <div className={`im-toast-container im-toast-container--${position}`}>
      {children}
    </div>
  );
}
