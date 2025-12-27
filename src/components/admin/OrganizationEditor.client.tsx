"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs, TabList, Tab, TabPanel, ConfirmationModal } from "@/components/ui";
import { BaseInfoTab, AddressTab, LogoTab, BannerTab } from "@/components/admin/EntityTabs";
import type { BaseInfoData, AddressData, LogoData, BannerData } from "@/components/admin/EntityTabs";
import "@/components/admin/EntityTabs/EntityTabs.css";

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  logo?: string | null;
  heroImage?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface OrganizationEditorProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrganizationData;
  onUpdate: (orgId: string, data: Partial<OrganizationData>) => Promise<unknown>;
  onRefresh: () => Promise<void>;
}

export function OrganizationEditor({
  isOpen,
  onClose,
  organization,
  onUpdate,
  onRefresh,
}: OrganizationEditorProps) {
  const t = useTranslations();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingTabId, setPendingTabId] = useState<string | null>(null);

  // Parse existing data
  const metadata = organization.metadata as {
    country?: string;
    street?: string;
    latitude?: number;
    longitude?: number;
    logoTheme?: 'light' | 'dark';
    secondLogoTheme?: 'light' | 'dark';
    logoCount?: 'one' | 'two';
    secondLogo?: string | null;
    bannerAlignment?: 'top' | 'center' | 'bottom';
  } | null;

  const addressParts = organization.address?.split(", ") || [];
  const street = metadata?.street || addressParts[0] || "";
  const city = addressParts.length > 1 ? addressParts[1] : "";
  const postalCode = addressParts.length > 2 ? addressParts[2] : "";
  const country = metadata?.country || (addressParts.length > 3 ? addressParts[3] : "");

  const baseInfoData: BaseInfoData = {
    name: organization.name,
    description: organization.description || null,
  };

  const addressData: AddressData = {
    country,
    city,
    postalCode,
    street,
    latitude: metadata?.latitude || null,
    longitude: metadata?.longitude || null,
  };

  const logoData: LogoData = {
    logoCount: metadata?.logoCount || 'one',
    logo: organization.logo ? { url: organization.logo, key: "", preview: organization.logo } : null,
    logoTheme: metadata?.logoTheme || 'light',
    secondLogo: metadata?.secondLogo ? { url: metadata.secondLogo, key: "", preview: metadata.secondLogo } : null,
    secondLogoTheme: metadata?.secondLogoTheme || 'dark',
  };

  const bannerData: BannerData = {
    heroImage: organization.heroImage ? { url: organization.heroImage, key: "", preview: organization.heroImage } : null,
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
    await onUpdate(organization.id, {
      name: data.name,
      description: data.description,
    });
    await onRefresh();
    setHasUnsavedChanges(false);
  }, [organization.id, onUpdate, onRefresh]);

  const handleAddressSave = useCallback(async (data: AddressData) => {
    const addressParts = [
      data.street.trim(),
      data.city.trim(),
      data.postalCode.trim(),
      data.country.trim()
    ].filter(Boolean);
    const fullAddress = addressParts.join(", ");

    await onUpdate(organization.id, {
      address: fullAddress,
      metadata: {
        ...(organization.metadata as object || {}),
        country: data.country,
        street: data.street,
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
    await onRefresh();
    setHasUnsavedChanges(false);
  }, [organization.id, organization.metadata, onUpdate, onRefresh]);

  const handleLogoSave = useCallback(async (payload: { logo?: File | null; secondLogo?: File | null; metadata: Record<string, unknown> }) => {
    // Update metadata first
    await onUpdate(organization.id, {
      metadata: {
        ...(organization.metadata as object || {}),
        ...payload.metadata,
      },
    });

    // Upload logo if provided
    if (payload.logo) {
      const logoFormData = new FormData();
      logoFormData.append("file", payload.logo);
      logoFormData.append("type", "logo");

      const logoResponse = await fetch(`/api/images/organizations/${organization.id}/upload`, {
        method: "POST",
        body: logoFormData,
      });

      if (!logoResponse.ok) {
        const errorData = await logoResponse.json();
        throw new Error(errorData.error || t("organizations.errors.imageUploadFailed"));
      }
    }

    // Upload second logo if provided
    if (payload.secondLogo) {
      const secondLogoFormData = new FormData();
      secondLogoFormData.append("file", payload.secondLogo);
      secondLogoFormData.append("type", "secondLogo");

      const secondLogoResponse = await fetch(`/api/images/organizations/${organization.id}/upload`, {
        method: "POST",
        body: secondLogoFormData,
      });

      if (!secondLogoResponse.ok) {
        const errorData = await secondLogoResponse.json();
        throw new Error(errorData.error || t("organizations.errors.imageUploadFailed"));
      }
    }

    await onRefresh();
    setHasUnsavedChanges(false);
  }, [organization.id, organization.metadata, onUpdate, onRefresh, t]);

  const handleBannerSave = useCallback(async (file: File | null, alignment: 'top' | 'center' | 'bottom') => {
    // Update metadata with alignment first
    await onUpdate(organization.id, {
      metadata: {
        ...(organization.metadata as object || {}),
        bannerAlignment: alignment,
      },
    });

    // Upload file if provided
    if (file) {
      const heroFormData = new FormData();
      heroFormData.append("file", file);
      heroFormData.append("type", "heroImage");

      const heroResponse = await fetch(`/api/images/organizations/${organization.id}/upload`, {
        method: "POST",
        body: heroFormData,
      });

      if (!heroResponse.ok) {
        const errorData = await heroResponse.json();
        throw new Error(errorData.error || t("organizations.errors.imageUploadFailed"));
      }
    }

    await onRefresh();
    setHasUnsavedChanges(false);
  }, [organization.id, organization.metadata, onUpdate, onRefresh, t]);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={t("organizations.editor.title")}
      >
        <Tabs defaultTab="baseInfo" onTabChange={handleTabChange}>
          <TabList>
            <Tab
              id="baseInfo"
              label={t("organizations.tabs.baseInfo.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v20M2 12h20" />
                </svg>
              }
            />
            <Tab
              id="address"
              label={t("organizations.tabs.address.tabLabel")}
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              }
            />
            <Tab
              id="logo"
              label={t("organizations.tabs.logo.tabLabel")}
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

          <TabPanel id="baseInfo">
            <BaseInfoTab
              initialData={baseInfoData}
              onSave={handleBaseInfoSave}
            />
          </TabPanel>

          <TabPanel id="address">
            <AddressTab
              initialData={addressData}
              onSave={handleAddressSave}
            />
          </TabPanel>

          <TabPanel id="logo">
            <LogoTab
              initialData={logoData}
              onSave={handleLogoSave}
            />
          </TabPanel>

          <TabPanel id="banner">
            <BannerTab
              initialData={bannerData}
              onSave={handleBannerSave}
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
