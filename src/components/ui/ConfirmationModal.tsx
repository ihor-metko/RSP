"use client";

import { useTranslations } from "next-intl";
import { Modal, Button } from "@/components/ui";
import "./ConfirmationModal.css";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isProcessing?: boolean;
  children?: React.ReactNode;
}

/**
 * Reusable Confirmation Modal Component
 * 
 * A customizable confirmation dialog that replaces browser confirm() dialogs.
 * Follows the application's dark theme with im-* classes.
 * 
 * Props:
 * - isOpen: Whether the modal is visible
 * - onClose: Callback when modal is closed/cancelled
 * - onConfirm: Callback when user confirms the action
 * - title: Optional modal title (defaults to translation key)
 * - message: The confirmation message to display
 * - confirmText: Optional custom text for confirm button
 * - cancelText: Optional custom text for cancel button
 * - variant: Button variant for confirm button ("danger" | "primary")
 * - isProcessing: Whether an action is in progress (disables buttons)
 * - children: Optional additional content (e.g., booking details)
 */
export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  variant = "danger",
  isProcessing = false,
  children,
}: ConfirmationModalProps) {
  const t = useTranslations();

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || t("confirmation.title")}
    >
      <div className="im-confirmation-modal">
        <div className="im-confirmation-modal-message">
          {message}
        </div>
        
        {children && (
          <div className="im-confirmation-modal-content">
            {children}
          </div>
        )}

        <div className="im-confirmation-modal-actions">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            {cancelText || t("common.cancel")}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {confirmText || t("confirmation.confirm")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
