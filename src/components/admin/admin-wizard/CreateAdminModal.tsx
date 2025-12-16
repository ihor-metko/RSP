"use client";

import { Modal } from "@/components/ui";
import { CreateAdminWizard } from "./CreateAdminWizard.client";
import type { CreateAdminWizardConfig } from "@/types/adminWizard";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CreateAdminWizardConfig;
}

/**
 * CreateAdminModal - A reusable modal for creating admins
 * 
 * This modal wraps the CreateAdminWizard component and can be used
 * in both organization and club contexts. It provides a clean modal
 * interface for the admin creation flow.
 */
export function CreateAdminModal({
  isOpen,
  onClose,
  config,
}: CreateAdminModalProps) {
  // Create a wrapped config that includes onCancel to close the modal
  const wrappedConfig: CreateAdminWizardConfig = {
    ...config,
    onSuccess: (userId) => {
      // Call the original onSuccess callback if provided
      if (config.onSuccess) {
        config.onSuccess(userId);
      }
      // Close the modal after success
      onClose();
    },
    onCancel: () => {
      // Call the original onCancel callback if provided
      if (config.onCancel) {
        config.onCancel();
      }
      // Close the modal
      onClose();
    },
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        config.context === "club"
          ? "Create Club Admin"
          : "Create Admin"
      }
    >
      <CreateAdminWizard config={wrappedConfig} />
    </Modal>
  );
}
