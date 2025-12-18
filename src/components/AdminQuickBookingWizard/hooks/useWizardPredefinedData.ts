/**
 * Custom hook for initializing wizard with predefined data
 */
import { useEffect, useState } from "react";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";
import type { WizardOrganization, WizardClub, PredefinedData } from "../types";

interface UseWizardPredefinedDataOptions {
  isOpen: boolean;
  predefinedData?: PredefinedData;
}

interface UseWizardPredefinedDataReturn {
  predefinedOrganization: WizardOrganization | null;
  predefinedClub: WizardClub | null;
  isLoading: boolean;
}

/**
 * Hook for initializing wizard with predefined organization and club data
 * Fetches and resolves the full objects from stores if IDs are provided
 */
export function useWizardPredefinedData({
  isOpen,
  predefinedData,
}: UseWizardPredefinedDataOptions): UseWizardPredefinedDataReturn {
  const [predefinedOrganization, setPredefinedOrganization] = 
    useState<WizardOrganization | null>(null);
  const [predefinedClub, setPredefinedClub] = useState<WizardClub | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once when modal opens
    if (!isOpen || hasInitialized) {
      return;
    }

    const initializePredefinedData = async () => {
      setIsLoading(true);

      try {
        // Fetch organization and club in parallel for better performance
        const [orgToSet, clubToSet] = await Promise.all([
          // Initialize organization if predefined
          predefinedData?.organizationId
            ? (async () => {
                const orgStore = useOrganizationStore.getState();
                const getOrganizationById = orgStore.getOrganizationById;
                const fetchOrganizations = orgStore.fetchOrganizations;

                // First try to get from current store state
                let org = getOrganizationById(predefinedData.organizationId!);

                // If not in store, fetch organizations first
                if (!org) {
                  try {
                    await fetchOrganizations();
                    org = useOrganizationStore
                      .getState()
                      .getOrganizationById(predefinedData.organizationId!);
                  } catch {
                    // Handle error silently as the organization might not be accessible
                  }
                }

                return org || null;
              })()
            : Promise.resolve(null),

          // Initialize club if predefined
          predefinedData?.clubId
            ? (async () => {
                const clubStore = useClubStore.getState();
                const getClubById = clubStore.getClubById;
                const fetchClubsIfNeeded = clubStore.fetchClubsIfNeeded;

                try {
                  // Try to get from current store state first
                  let club = getClubById(predefinedData.clubId!);

                  // If not in store, fetch clubs to populate the store
                  if (!club) {
                    await fetchClubsIfNeeded();
                    club = useClubStore.getState().getClubById(predefinedData.clubId!);
                  }

                  return club || null;
                } catch {
                  // Handle error silently as the club might not be accessible
                  return null;
                }
              })()
            : Promise.resolve(null),
        ]);

        if (orgToSet) {
          setPredefinedOrganization(orgToSet);
        }

        if (clubToSet) {
          setPredefinedClub(clubToSet);
        }
      } finally {
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    initializePredefinedData();
  }, [isOpen, hasInitialized, predefinedData?.organizationId, predefinedData?.clubId]);

  // Reset when modal closes  
  useEffect(() => {
    // Reset initialization state when modal is no longer open
    if (!isOpen && hasInitialized) {
      setHasInitialized(false);
      setPredefinedOrganization(null);
      setPredefinedClub(null);
    }
  }, [isOpen, hasInitialized]);

  return {
    predefinedOrganization,
    predefinedClub,
    isLoading,
  };
}
