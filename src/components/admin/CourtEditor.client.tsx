"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs, TabList, Tab, TabPanel, ConfirmationModal } from "@/components/ui";
import { DetailedInfoTab, BannerTab } from "@/components/admin/EntityTabs";
import type { DetailedInfoData, BannerData } from "@/components/admin/EntityTabs";
import { parseCourtBannerData } from "@/utils/court-metadata";
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
  const [pendingTabId, setPendingTabId] = useState<string | null>(null);

  // Parse bannerData from JSON string
  const parsedBannerData = parseCourtBannerData(court.bannerData);

  const detailedInfoData: DetailedInfoData = {
    name: court.name,
    description: court.description || null,
  };

  const bannerData: BannerData = {
    heroImage: parsedBannerData?.url ? { url: parsedBannerData.url, key: "", preview: parsedBannerData.url } : null,
    bannerAlignment: parsedBannerData?.bannerAlignment || 'center',
  };

  const handleTabChange = useCallback(async (newTabId: string) => {
    if (hasUnsavedChanges) {
      setPendingTabId(newTabId);
      setShowUnsavedWarning(true);
      return false;
    }
    return true;
  }, [hasUnsavedChanges]);

  const handleConfirmTabChange = useCallback(() => {
    setPendingTabId(null);
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
  }, []);

  const handleCancelTabChange = useCallback(() => {
    setPendingTabId(null);
    setShowUnsavedWarning(false);
  }, []);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      setPendingTabId(null);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    onClose();
  }, [onClose]);

  const handleDetailedInfoSave = useCallback(async (data: DetailedInfoData) => {
    // Update court with new name and description
    const response = await fetch(`/api/admin/courts/${court.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t("courts.errors.updateFailed"));
    }

    await onRefresh();
    setHasUnsavedChanges(false);
  }, [court.id, onRefresh, t]);

  const handleBannerSave = useCallback(async (file: File | null, alignment: 'top' | 'center' | 'bottom') => {
    // Parse existing bannerData and merge with new alignment
    const existingBannerData = parseCourtBannerData(court.bannerData);
    const newBannerData = {
      ...existingBannerData,
      bannerAlignment: alignment,
    };

    // If we're uploading a new file, we need to upload it first
    if (file) {
      const bannerFormData = new FormData();
      bannerFormData.append("file", file);
      bannerFormData.append("type", "heroImage");
      // Pass alignment as a parameter
      bannerFormData.append("bannerAlignment", alignment);

      const bannerResponse = await fetch(`/api/images/courts/${court.id}/upload`, {
        method: "POST",
        body: bannerFormData,
      });

      if (!bannerResponse.ok) {
        const errorData = await bannerResponse.json();
        throw new Error(errorData.error || t("courts.errors.imageUploadFailed"));
      }
    } else {
      // Just update alignment without uploading new image
      // We need to update the bannerData field directly via API
      // This requires adding support to the court update endpoint
      const response = await fetch(`/api/admin/courts/${court.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bannerData: JSON.stringify(newBannerData),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("courts.errors.updateFailed"));
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
        <Tabs defaultTab="detailedInfo" onTabChange={handleTabChange}>
          <TabList>
            <Tab
              id="detailedInfo"
              label={t("courts.tabs.detailedInfo.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v20M2 12h20" />
                </svg>
              }
            />
            <Tab
              id="banner"
              label={t("courts.tabs.banner.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
            />
          </TabList>

          <TabPanel id="detailedInfo">
            <DetailedInfoTab
              initialData={detailedInfoData}
              onSave={handleDetailedInfoSave}
              translationNamespace="courts.tabs"
            />
          </TabPanel>

          <TabPanel id="banner">
            <BannerTab
              initialData={bannerData}
              onSave={handleBannerSave}
              translationNamespace="courts.tabs"
            />
          </TabPanel>
        </Tabs>
      </Modal>

      {showUnsavedWarning && <ConfirmationModal
        isOpen={showUnsavedWarning}
        onClose={handleCancelTabChange}
        onConfirm={pendingTabId === null ? handleConfirmClose : handleConfirmTabChange}
        title={t("common.unsavedChanges")}
        message={t("common.unsavedChangesMessage")}
        confirmText={t("common.discardChanges")}
        cancelText={t("common.cancel")}
        variant="danger"
      />}
    </>
  );
}
