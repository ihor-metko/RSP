"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs, TabList, Tab, TabPanel, ConfirmationModal } from "@/components/ui";
import { BaseInfoTab, AddressTab, LogoTab, BannerTab } from "@/components/admin/EntityTabs";
import type { BaseInfoData, AddressData, LogoData, BannerData } from "@/components/admin/EntityTabs";
import type { Address } from "@/types/address";
import type { LogoData as OrgLogoData, BannerData as OrgBannerData } from "@/types/organization";
import "@/components/admin/EntityTabs/EntityTabs.css";

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  // Support both legacy string and new Address object
  address?: string | Address | null;
  logoData?: OrgLogoData | null;
  bannerData?: OrgBannerData | null;
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

  // Parse logoData and bannerData from JSON strings if needed
  let parsedLogoData: OrgLogoData | null = null;
  let parsedBannerData: OrgBannerData | null = null;

  if (organization.logoData) {
    if (typeof organization.logoData === 'string') {
      try {
        parsedLogoData = JSON.parse(organization.logoData);
      } catch {
        parsedLogoData = null;
      }
    } else {
      parsedLogoData = organization.logoData;
    }
  }

  if (organization.bannerData) {
    if (typeof organization.bannerData === 'string') {
      try {
        parsedBannerData = JSON.parse(organization.bannerData);
      } catch {
        parsedBannerData = null;
      }
    } else {
      parsedBannerData = organization.bannerData;
    }
  }

  // Handle both legacy string address and new Address object
  let street = "";
  let city = "";
  let postalCode = "";
  let country = "";
  let latitude: number | null = null;
  let longitude: number | null = null;
  
  if (typeof organization.address === 'string') {
    // Legacy string format - parse what we can
    const addressParts = organization.address?.split(", ") || [];
    street = addressParts[0] || "";
    city = addressParts.length > 1 ? addressParts[1] : "";
    postalCode = addressParts.length > 2 ? addressParts[2] : "";
    country = addressParts.length > 3 ? addressParts[3] : "";
  } else if (organization.address) {
    // New Address object format
    const addr = organization.address as Address;
    street = addr.street || "";
    city = addr.city || "";
    postalCode = addr.postalCode || "";
    country = addr.country || "";
    latitude = addr.lat || null;
    longitude = addr.lng || null;
  }

  const baseInfoData: BaseInfoData = {
    name: organization.name,
    description: organization.description || null,
  };

  const addressData: AddressData = {
    country,
    city,
    postalCode,
    street,
    latitude,
    longitude,
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
    // Use new Address object format
    const addressData: Address = {
      street: data.street.trim(),
      city: data.city.trim(),
      postalCode: data.postalCode.trim(),
      country: data.country.trim(),
      lat: data.latitude,
      lng: data.longitude,
      formattedAddress: [
        data.street.trim(),
        data.city.trim(),
        data.postalCode.trim(),
        data.country.trim()
      ].filter(Boolean).join(", "),
    };

    await onUpdate(organization.id, {
      address: addressData,
    });
    await onRefresh();
    setHasUnsavedChanges(false);
  }, [organization.id, onUpdate, onRefresh]);

  const handleLogoSave = useCallback(async (payload: { logo?: File | null; secondLogo?: File | null; metadata: Record<string, unknown> }) => {
    // Get existing logoData
    let existingLogoData: Record<string, unknown> = {};
    if (parsedLogoData) {
      existingLogoData = { ...parsedLogoData };
    }

    // Update logoData with logo theme settings
    const updatedLogoData: OrgLogoData = {
      ...existingLogoData,
      logoTheme: payload.metadata.logoTheme as 'light' | 'dark' | undefined,
      secondLogoTheme: payload.metadata.secondLogoTheme as 'light' | 'dark' | undefined,
    };

    // Update organization logoData
    await onUpdate(organization.id, {
      logoData: updatedLogoData,
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
  }, [organization.id, parsedLogoData, onUpdate, onRefresh, t]);

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

    // Update organization bannerData
    await onUpdate(organization.id, {
      bannerData: updatedBannerData,
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
  }, [organization.id, parsedBannerData, onUpdate, onRefresh, t]);

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
