"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs, TabList, Tab, TabPanel, ConfirmationModal } from "@/components/ui";
import { BaseInfoTab, AddressTab, LogoTab, BannerTab, TimezoneTab } from "@/components/admin/EntityTabs";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { BaseInfoData, AddressData, LogoData, BannerData, TimezoneData } from "@/components/admin/EntityTabs";
import type { ClubDetail, LogoData as ClubLogoData, BannerData as ClubBannerData } from "@/types/club";
import "@/components/admin/EntityTabs/EntityTabs.css";

interface ClubEditorProps {
  isOpen: boolean;
  onClose: () => void;
  club: ClubDetail;
  onRefresh: () => Promise<void>;
}

export function ClubEditor({
  isOpen,
  onClose,
  club,
  onRefresh,
}: ClubEditorProps) {
  const t = useTranslations();
  const updateClubInStore = useAdminClubStore((state) => state.updateClubInStore);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingTabId, setPendingTabId] = useState<string | null>(null);

  // Parse logoData and bannerData from JSON strings if needed
  let parsedLogoData: ClubLogoData | null = null;
  let parsedBannerData: ClubBannerData | null = null;

  if (club.logoData) {
    if (typeof club.logoData === 'string') {
      try {
        parsedLogoData = JSON.parse(club.logoData);
      } catch {
        parsedLogoData = null;
      }
    } else {
      parsedLogoData = club.logoData;
    }
  }

  if (club.bannerData) {
    if (typeof club.bannerData === 'string') {
      try {
        parsedBannerData = JSON.parse(club.bannerData);
      } catch {
        parsedBannerData = null;
      }
    } else {
      parsedBannerData = club.bannerData;
    }
  }

  const baseInfoData: BaseInfoData = {
    name: club.name,
    description: club.shortDescription || null,
  };

  const addressData: AddressData = {
    country: club.address?.country || "",
    city: club.address?.city || "",
    postalCode: club.address?.postalCode || "",
    street: club.address?.street || "",
    latitude: club.address?.lat || null,
    longitude: club.address?.lng || null,
  };

  const logoData: LogoData = {
    logoCount: parsedLogoData?.secondLogo ? 'two' : 'one',
    logo: parsedLogoData?.url ? { url: parsedLogoData.url, key: "", preview: parsedLogoData.url } : null,
    logoTheme: parsedLogoData?.logoTheme || 'light',
    secondLogo: parsedLogoData?.secondLogo ? { url: parsedLogoData.secondLogo, key: "", preview: parsedLogoData.secondLogo } : null,
    secondLogoTheme: parsedLogoData?.secondLogoTheme || 'dark',
  };

  const bannerData: BannerData = {
    heroImage: parsedBannerData?.url ? { url: parsedBannerData.url, key: "", preview: parsedBannerData.url } : null,
    bannerAlignment: parsedBannerData?.bannerAlignment || 'center',
  };

  const timezoneData: TimezoneData = {
    timezone: club.timezone,
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

  const handleBaseInfoSave = useCallback(async (data: BaseInfoData) => {
    const response = await fetch(`/api/admin/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        shortDescription: data.description,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t("clubDetail.failedToSaveChanges"));
    }

    // Get updated club data from response
    const updatedClub = await response.json();

    // Update store reactively - no page reload needed
    updateClubInStore(club.id, updatedClub);

    setHasUnsavedChanges(false);
  }, [club.id, t, updateClubInStore]);

  const handleAddressSave = useCallback(async (data: AddressData) => {
    const response = await fetch(`/api/admin/clubs/${club.id}/address`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country: data.country,
        city: data.city,
        postalCode: data.postalCode,
        street: data.street,
        lat: data.latitude,
        lng: data.longitude,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t("clubDetail.failedToSaveChanges"));
    }

    // Get updated club data from response
    const updatedClub = await response.json();

    // Update store reactively - no page reload needed
    updateClubInStore(club.id, updatedClub);

    setHasUnsavedChanges(false);
  }, [club.id, t, updateClubInStore]);

  const handleLogoSave = useCallback(async (payload: { logo?: File | null; secondLogo?: File | null; metadata: Record<string, unknown> }) => {
    // Get existing logoData
    let existingLogoData: Record<string, unknown> = {};
    if (parsedLogoData) {
      existingLogoData = { ...parsedLogoData };
    }

    // Update logoData with logo theme settings
    const updatedLogoData = {
      ...existingLogoData,
      logoTheme: payload.metadata.logoTheme,
      secondLogoTheme: payload.metadata.secondLogoTheme,
    };

    // Update club logoData in database
    const response = await fetch(`/api/admin/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logoData: updatedLogoData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t("clubDetail.failedToSaveChanges"));
    }

    // Upload logo if provided
    if (payload.logo) {
      const logoFormData = new FormData();
      logoFormData.append("file", payload.logo);
      logoFormData.append("type", "logo");

      const logoResponse = await fetch(`/api/images/clubs/${club.id}/upload`, {
        method: "POST",
        body: logoFormData,
      });

      if (!logoResponse.ok) {
        const errorData = await logoResponse.json();
        throw new Error(errorData.error || t("clubs.errors.imageUploadFailed"));
      }
    }

    // Upload second logo if provided
    if (payload.secondLogo) {
      const secondLogoFormData = new FormData();
      secondLogoFormData.append("file", payload.secondLogo);
      secondLogoFormData.append("type", "secondLogo");

      const secondLogoResponse = await fetch(`/api/images/clubs/${club.id}/upload`, {
        method: "POST",
        body: secondLogoFormData,
      });

      if (!secondLogoResponse.ok) {
        const errorData = await secondLogoResponse.json();
        throw new Error(errorData.error || t("clubs.errors.imageUploadFailed"));
      }
    }

    // Refetch club data after all operations complete
    // This is necessary because file upload endpoints don't return the full club object
    if (onRefresh) {
      await onRefresh();
    }

    setHasUnsavedChanges(false);
  }, [club.id, parsedLogoData, onRefresh, t]);

  const handleBannerSave = useCallback(async (file: File | null, alignment: 'top' | 'center' | 'bottom') => {
    // Get existing bannerData
    let existingBannerData: Record<string, unknown> = {};
    if (parsedBannerData) {
      existingBannerData = { ...parsedBannerData };
    }

    // Update bannerData with alignment
    const updatedBannerData = {
      ...existingBannerData,
      bannerAlignment: alignment,
    };

    // Update club bannerData in database
    const response = await fetch(`/api/admin/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bannerData: updatedBannerData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || t("clubDetail.failedToSaveChanges"));
    }

    // Upload file if provided
    if (file) {
      const heroFormData = new FormData();
      heroFormData.append("file", file);
      heroFormData.append("type", "heroImage");

      const heroResponse = await fetch(`/api/images/clubs/${club.id}/upload`, {
        method: "POST",
        body: heroFormData,
      });

      if (!heroResponse.ok) {
        const errorData = await heroResponse.json();
        throw new Error(errorData.error || t("clubs.errors.imageUploadFailed"));
      }
    }

    // Refetch club data after all operations complete
    // This is necessary because file upload endpoints don't return the full club object
    if (onRefresh) {
      await onRefresh();
    }

    setHasUnsavedChanges(false);
  }, [club.id, parsedBannerData, onRefresh, t]);

  const handleTimezoneSave = useCallback(async (data: TimezoneData) => {
    const response = await fetch(`/api/admin/clubs/${club.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timezone: data.timezone,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Invalid response format" }));
      throw new Error(errorData.error || t("clubDetail.failedToSaveChanges"));
    }

    // Get updated club data from response
    const updatedClub = await response.json().catch(() => {
      throw new Error("Invalid response format");
    });

    // Update store reactively - no page reload needed
    updateClubInStore(club.id, updatedClub);

    setHasUnsavedChanges(false);
  }, [club.id, t, updateClubInStore]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t("clubs.editor.title")}
      >
        <Tabs defaultTab="baseInfo" onTabChange={handleTabChange}>
          <TabList>
            <Tab
              id="baseInfo"
              label={t("clubs.tabs.baseInfo.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v20M2 12h20" />
                </svg>
              }
            />
            <Tab
              id="address"
              label={t("clubs.tabs.address.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
            <Tab
              id="logo"
              label={t("clubs.tabs.logo.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              }
            />
            <Tab
              id="banner"
              label={t("clubs.tabs.banner.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              }
            />
            <Tab
              id="timezone"
              label={t("clubs.tabs.timezone.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              }
            />
          </TabList>

          <TabPanel id="baseInfo">
            <BaseInfoTab
              initialData={baseInfoData}
              onSave={handleBaseInfoSave}
              translationNamespace="clubs.tabs"
            />
          </TabPanel>

          <TabPanel id="address">
            <AddressTab
              initialData={addressData}
              onSave={handleAddressSave}
              translationNamespace="clubs.tabs"
            />
          </TabPanel>

          <TabPanel id="logo">
            <LogoTab
              initialData={logoData}
              onSave={handleLogoSave}
              translationNamespace="clubs.tabs"
            />
          </TabPanel>

          <TabPanel id="banner">
            <BannerTab
              initialData={bannerData}
              onSave={handleBannerSave}
              translationNamespace="clubs.tabs"
            />
          </TabPanel>

          <TabPanel id="timezone">
            <TimezoneTab
              initialData={timezoneData}
              onSave={handleTimezoneSave}
              translationNamespace="clubs.tabs"
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
