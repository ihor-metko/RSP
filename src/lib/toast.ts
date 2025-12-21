/**
 * Simple toast notification utility
 * Displays temporary messages to the user
 * Supports multiple queued notifications
 */

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  type?: ToastType;
  duration?: number;
}

/**
 * Maximum number of toasts to display at once
 */
const MAX_TOASTS = 5;

/**
 * Vertical spacing between toasts
 */
const TOAST_SPACING = 10;

/**
 * Show a toast notification
 */
export function showToast(message: string, options: ToastOptions = {}) {
  const { type = "info", duration = 3000 } = options;

  // Get existing toasts
  const existingToasts = Array.from(document.querySelectorAll(".im-toast"));
  
  // Remove oldest toast if we've reached the limit
  if (existingToasts.length >= MAX_TOASTS) {
    const oldestToast = existingToasts[0];
    oldestToast.classList.remove("im-toast--visible");
    setTimeout(() => {
      oldestToast.remove();
    }, 300);
  }

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `im-toast im-toast--${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");

  // Add to DOM
  document.body.appendChild(toast);

  // Position toast based on existing toasts
  updateToastPositions();

  // Trigger animation
  setTimeout(() => {
    toast.classList.add("im-toast--visible");
  }, 10);

  // Remove after duration
  setTimeout(() => {
    toast.classList.remove("im-toast--visible");
    setTimeout(() => {
      toast.remove();
      updateToastPositions();
    }, 300);
  }, duration);
}

/**
 * Update positions of all visible toasts
 */
function updateToastPositions() {
  const toasts = Array.from(document.querySelectorAll(".im-toast"));
  toasts.forEach((toast, index) => {
    const element = toast as HTMLElement;
    const topPosition = 20 + index * (60 + TOAST_SPACING); // 60px estimated toast height
    element.style.top = `${topPosition}px`;
  });
}

// Add global toast styles
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    .im-toast {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      opacity: 0;
      transform: translateX(20px);
      transition: opacity 0.3s ease, transform 0.3s ease, top 0.3s ease;
      max-width: 400px;
      word-wrap: break-word;
    }

    .im-toast--visible {
      opacity: 1;
      transform: translateX(0);
    }

    .im-toast--success {
      background-color: #10b981;
      color: white;
    }

    .im-toast--error {
      background-color: #ef4444;
      color: white;
    }

    .im-toast--warning {
      background-color: #f59e0b;
      color: white;
    }

    .im-toast--info {
      background-color: #3b82f6;
      color: white;
    }

    :root[data-theme="dark"] .im-toast {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }
  `;
  document.head.appendChild(style);
}
