/**
 * Custom hook for managing club data fetching in the wizard
 */
import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import type { WizardClub, AdminType, PredefinedData } from "../types";

interface UseWizardClubsOptions {
  isOpen: boolean;
  currentStep: number;
  adminType: AdminType;
  selectedOrganizationId: string | null;
  predefinedData?: PredefinedData;
}

interface UseWizardClubsReturn {
  clubs: WizardClub[];
  isLoading: boolean;
  error: string | null;
  fetchClubs: () => Promise<void>;
}

/**
 * Hook for fetching and managing clubs in the wizard
 * Filters clubs based on admin type and selected organization
 */
export function useWizardClubs({
  isOpen,
  currentStep,
  adminType,
  selectedOrganizationId,
  predefinedData,
}: UseWizardClubsOptions): UseWizardClubsReturn {
  const t = useTranslations();
  const [clubs, setClubs] = useState<WizardClub[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);

  const fetchClubs = useCallback(async () => {
    if (!isOpen || currentStep !== 2) {
      return;
    }

    // Skip if club is predefined
    if (predefinedData?.clubId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use store method with inflight guard to prevent duplicate requests
      await fetchClubsIfNeeded();

      // Map clubs from store to wizard format
      const storeClubs = useClubStore.getState().clubs;
      let mappedClubs: WizardClub[] = storeClubs.map((club) => ({
        id: club.id,
        name: club.name,
        organizationId: club.organization?.id || "",
        organizationName: club.organization?.name,
      }));

      // Filter by selected organization for root admin
      if (adminType === "root_admin" && selectedOrganizationId) {
        mappedClubs = mappedClubs.filter(
          (c) => c.organizationId === selectedOrganizationId
        );
      }

      setClubs(mappedClubs);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }, [
    isOpen,
    currentStep,
    adminType,
    selectedOrganizationId,
    predefinedData,
    fetchClubsIfNeeded,
    t,
  ]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  return {
    clubs,
    isLoading,
    error,
    fetchClubs,
  };
}
