"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs, TabList, Tab, TabPanel, ConfirmationModal } from "@/components/ui";
import { BaseInfoTab, AddressTab, LogoTab, BannerTab } from "@/components/admin/EntityTabs";
import type { BaseInfoData, AddressData, LogoData, BannerData } from "@/components/admin/EntityTabs";
import { parseClubMetadata } from "@/types/club";
import type { ClubDetail } from "@/types/club";
import "@/components/admin/EntityTabs/EntityTabs.css";

interface ClubEditorProps {
  isOpen: boolean;
  onClose: () => void;
  club: ClubDetail;
  onUpdate: (section: string, payload: Record<string, unknown>) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}

export function ClubEditor({
  isOpen,
  onClose,
  club,
  onUpdate,
  onRefresh,
}: ClubEditorProps) {
  const t = useTranslations();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingTabId, setPendingTabId] = useState<string | null>(null);

  // Parse metadata from JSON string
  const metadata = parseClubMetadata(club.metadata);

  const baseInfoData: BaseInfoData = {
    name: club.name,
    description: club.shortDescription || null,
  };

  const addressData: AddressData = {
    country: club.country || "",
    city: club.city || "",
    postalCode: "", // Clubs don't have postal code in the current schema
    street: club.location || "",
    latitude: club.latitude || null,
    longitude: club.longitude || null,
  };

  const logoData: LogoData = {
    logoCount: metadata?.secondLogo ? 'two' : 'one',
    logo: club.logoData?.url ? { url: club.logoData.url, key: "", preview: club.logoData.url } : null,
    logoTheme: metadata?.logoTheme || 'light',
    secondLogo: metadata?.secondLogo ? { url: metadata.secondLogo, key: "", preview: metadata.secondLogo } : null,
    secondLogoTheme: metadata?.secondLogoTheme || 'dark',
  };

  const bannerData: BannerData = {
    heroImage: club.bannerData?.url ? { url: club.bannerData.url, key: "", preview: club.bannerData.url } : null,
    bannerAlignment: metadata?.bannerAlignment || 'center',
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
    await onUpdate("header", {
      name: data.name,
      shortDescription: data.description,
    });
    await onRefresh();
    setHasUnsavedChanges(false);
  }, [onUpdate, onRefresh]);

  const handleAddressSave = useCallback(async (data: AddressData) => {
    await onUpdate("location", {
      location: data.street,
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
    });
    await onRefresh();
    setHasUnsavedChanges(false);
  }, [onUpdate, onRefresh]);

  const handleLogoSave = useCallback(async (payload: { logo?: File | null; secondLogo?: File | null; metadata: Record<string, unknown> }) => {
    // Parse existing metadata
    let existingMetadata: Record<string, unknown> = {};
    if (club.metadata) {
      try {
        existingMetadata = JSON.parse(club.metadata);
      } catch {
        // Invalid JSON, start fresh
        existingMetadata = {};
      }
    }

    // Update metadata with logo settings
    await onUpdate("metadata", {
      metadata: JSON.stringify({
        ...existingMetadata,
        ...payload.metadata,
      }),
    });

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

    await onRefresh();
    setHasUnsavedChanges(false);
  }, [club.id, club.metadata, onUpdate, onRefresh, t]);

  const handleBannerSave = useCallback(async (file: File | null, alignment: 'top' | 'center' | 'bottom') => {
    // Parse existing metadata
    let existingMetadata: Record<string, unknown> = {};
    if (club.metadata) {
      try {
        existingMetadata = JSON.parse(club.metadata);
      } catch {
        // Invalid JSON, start fresh
        existingMetadata = {};
      }
    }

    // Update metadata with alignment
    await onUpdate("metadata", {
      metadata: JSON.stringify({
        ...existingMetadata,
        bannerAlignment: alignment,
      }),
    });

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

    await onRefresh();
    setHasUnsavedChanges(false);
  }, [club.id, club.metadata, onUpdate, onRefresh, t]);

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
        </Tabs>
      </Modal>

      <ConfirmationModal
        isOpen={showUnsavedWarning}
        onClose={handleCancelTabChange}
        onConfirm={pendingTabId === null ? handleConfirmClose : handleConfirmTabChange}
        title={t("common.unsavedChanges")}
        message={t("common.unsavedChangesMessage")}
        confirmText={t("common.discardChanges")}
        cancelText={t("common.cancel")}
        variant="danger"
      />
    </>
  );
}
