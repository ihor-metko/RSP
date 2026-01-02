"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs, TabList, Tab, TabPanel, ConfirmationModal } from "@/components/ui";
import { BannerTab } from "@/components/admin/EntityTabs";
import type { BannerData } from "@/components/admin/EntityTabs";
import type { CourtDetail } from "@/types/court";
import "@/components/admin/EntityTabs/EntityTabs.css";

interface CourtEditorProps {
  isOpen: boolean;
  onClose: () => void;
  court: CourtDetail;
  onRefresh: () => Promise<void>;
}

export function CourtEditor({
  isOpen,
  onClose,
  court,
  onRefresh,
}: CourtEditorProps) {
  const t = useTranslations();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  const bannerData: BannerData = {
    heroImage: court.bannerData?.url ? { url: court.bannerData.url, key: "", preview: court.bannerData.url } : null,
    bannerAlignment: (court.bannerData?.position as 'top' | 'center' | 'bottom' | undefined) || 'center',
  };

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowUnsavedWarning(false);
  }, []);

  const handleBannerSave = useCallback(async (file: File | null, alignment: 'top' | 'center' | 'bottom') => {
    // Get existing bannerData to preserve other fields
    let existingBannerData: Record<string, unknown> = {};
    if (court.bannerData) {
      if (typeof court.bannerData === 'string') {
        try {
          existingBannerData = JSON.parse(court.bannerData);
        } catch {
          // Invalid JSON, start fresh
          existingBannerData = {};
        }
      } else {
        existingBannerData = court.bannerData as Record<string, unknown>;
      }
    }

    // Update bannerData with new position
    const updatedBannerData = {
      ...existingBannerData,
      position: alignment,
    };

    // Update court with new bannerData
    const response = await fetch(`/api/admin/courts/${court.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bannerData: updatedBannerData,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || t("courts.errors.updateFailed"));
    }

    // Upload file if provided
    if (file) {
      const bannerFormData = new FormData();
      bannerFormData.append("file", file);
      bannerFormData.append("type", "heroImage");

      const bannerResponse = await fetch(`/api/images/courts/${court.id}/upload`, {
        method: "POST",
        body: bannerFormData,
      });

      if (!bannerResponse.ok) {
        const errorData = await bannerResponse.json();
        throw new Error(errorData.error || t("courts.errors.imageUploadFailed"));
      }
    }

    await onRefresh();
    setHasUnsavedChanges(false);
  }, [court.id, court.bannerData, onRefresh, t]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t("courts.editor.title")}
      >
        <Tabs defaultTab="banner">
          <TabList>
            <Tab
              id="banner"
              label={t("organizations.tabs.banner.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
            />
          </TabList>

          <TabPanel id="banner">
            <BannerTab
              initialData={bannerData}
              onSave={handleBannerSave}
            />
          </TabPanel>
        </Tabs>
      </Modal>

      {showUnsavedWarning && <ConfirmationModal
        isOpen={showUnsavedWarning}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title={t("common.unsavedChanges")}
        message={t("common.unsavedChangesMessage")}
        confirmText={t("common.discardChanges")}
        cancelText={t("common.cancel")}
        variant="danger"
      />}
    </>
  );
}
