/**
 * Custom hook for initializing wizard with predefined data
 */
import { useEffect, useState } from "react";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useCourtStore } from "@/stores/useCourtStore";
import type { WizardOrganization, WizardClub, WizardCourt, PredefinedData } from "../types";

interface UseWizardPredefinedDataOptions {
  isOpen: boolean;
  predefinedData?: PredefinedData;
}

interface UseWizardPredefinedDataReturn {
  predefinedOrganization: WizardOrganization | null;
  predefinedClub: WizardClub | null;
  predefinedCourt: WizardCourt | null;
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
  const [predefinedCourt, setPredefinedCourt] = useState<WizardCourt | null>(null);
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
        // Fetch organization, club, and court in parallel for better performance
        const [orgToSet, clubToSet, courtToSet] = await Promise.all([
          // Initialize organization if predefined
          predefinedData?.organizationId
            ? (async () => {
                const organizationId = predefinedData.organizationId;
                if (!organizationId) return null;

                const orgStore = useOrganizationStore.getState();
                const getOrganizationById = orgStore.getOrganizationById;
                const fetchOrganizations = orgStore.fetchOrganizations;

                // First try to get from current store state
                let org = getOrganizationById(organizationId);

                // If not in store, fetch organizations first
                if (!org) {
                  try {
                    await fetchOrganizations();
                    org = useOrganizationStore
                      .getState()
                      .getOrganizationById(organizationId);
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
                const clubId = predefinedData.clubId;
                if (!clubId) return null;

                const clubStore = useAdminClubStore.getState();
                const getClubById = clubStore.getClubById;
                const fetchClubsIfNeeded = clubStore.fetchClubsIfNeeded;

                try {
                  // Try to get from current store state first
                  let club = getClubById(clubId);

                  // If not in store, fetch clubs to populate the store
                  if (!club) {
                    await fetchClubsIfNeeded();
                    club = useAdminClubStore.getState().getClubById(clubId);
                  }

                  return club || null;
                } catch {
                  // Handle error silently as the club might not be accessible
                  return null;
                }
              })()
            : Promise.resolve(null),

          // Initialize court if predefined
          predefinedData?.courtId
            ? (async () => {
                const courtId = predefinedData.courtId;
                if (!courtId) return null;

                const courtStore = useCourtStore.getState();
                const ensureCourtById = courtStore.ensureCourtById;

                try {
                  // Fetch court details using clubId if available
                  const court = await ensureCourtById(
                    courtId,
                    { clubId: predefinedData.clubId }
                  );

                  // Convert CourtDetail to WizardCourt format
                  if (court) {
                    return {
                      id: court.id,
                      name: court.name,
                      slug: court.slug || null,
                      type: court.type || null,
                      surface: court.surface || null,
                      indoor: court.indoor || false,
                      defaultPriceCents: court.defaultPriceCents,
                      available: true,
                    } as WizardCourt;
                  }

                  return null;
                } catch {
                  // Handle error silently as the court might not be accessible
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

        if (courtToSet) {
          setPredefinedCourt(courtToSet);
        }
      } finally {
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    initializePredefinedData();
  }, [isOpen, hasInitialized, predefinedData?.organizationId, predefinedData?.clubId, predefinedData?.courtId]);

  // Reset when modal closes  
  useEffect(() => {
    // Reset initialization state when modal is no longer open
    if (!isOpen && hasInitialized) {
      setHasInitialized(false);
      setPredefinedOrganization(null);
      setPredefinedClub(null);
      setPredefinedCourt(null);
    }
  }, [isOpen, hasInitialized]);

  return {
    predefinedOrganization,
    predefinedClub,
    predefinedCourt,
    isLoading,
  };
}
