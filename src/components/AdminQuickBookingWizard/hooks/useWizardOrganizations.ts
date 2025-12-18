/**
 * Custom hook for managing organization data fetching in the wizard
 */
import { useEffect, useState, useMemo } from "react";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { toOrganizationOption } from "@/utils/organization";
import type { WizardOrganization, AdminType, PredefinedData } from "../types";

interface UseWizardOrganizationsOptions {
  isOpen: boolean;
  currentStep: number;
  adminType: AdminType;
  predefinedData?: PredefinedData;
}

interface UseWizardOrganizationsReturn {
  organizations: WizardOrganization[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for fetching and managing organizations in the wizard
 * Only fetches when on step 1, modal is open, and user is root admin
 */
export function useWizardOrganizations({
  isOpen,
  currentStep,
  adminType,
  predefinedData,
}: UseWizardOrganizationsOptions): UseWizardOrganizationsReturn {
  const [organizations, setOrganizations] = useState<WizardOrganization[]>([]);
  
  // Use Zustand store for organizations with auto-fetch
  const storeOrganizations = useOrganizationStore((state) => 
    state.getOrganizationsWithAutoFetch()
  );
  const isLoading = useOrganizationStore((state) => state.loading);
  const error = useOrganizationStore((state) => state.error);

  // Memoize the mapped organizations to avoid unnecessary computations
  const mappedOrganizations = useMemo(
    () => storeOrganizations.map(toOrganizationOption),
    [storeOrganizations]
  );

  useEffect(() => {
    // Only fetch for root admin on step 1 when modal is open
    if (!isOpen || currentStep !== 1 || adminType !== "root_admin") {
      return;
    }

    // Skip if organization is predefined
    if (predefinedData?.organizationId) {
      return;
    }

    // Update organizations when store data changes
    if (mappedOrganizations.length > 0) {
      setOrganizations(mappedOrganizations);
    }
  }, [isOpen, currentStep, adminType, predefinedData, mappedOrganizations]);

  return {
    organizations,
    isLoading,
    error,
  };
}
