/**
 * Custom hook for initializing wizard with predefined data
 */
import { useEffect, useState, useMemo } from "react";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";
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
 * Helper to synchronously get predefined data from stores
 * This avoids the async flicker by checking the store immediately
 */
function getPredefinedDataFromStores(predefinedData?: PredefinedData): {
  organization: WizardOrganization | null;
  club: WizardClub | null;
  court: WizardCourt | null;
} {
  let organization: WizardOrganization | null = null;
  let club: WizardClub | null = null;
  let court: WizardCourt | null = null;

  if (predefinedData?.organizationId) {
    const orgStore = useOrganizationStore.getState();
    organization = orgStore.getOrganizationById(predefinedData.organizationId) || null;
  }

  if (predefinedData?.clubId) {
    const clubStore = useClubStore.getState();
    club = clubStore.getClubById(predefinedData.clubId) || null;
  }

  if (predefinedData?.courtId) {
    const courtStore = useCourtStore.getState();
    const courtDetail = courtStore.courtsById[predefinedData.courtId];
    if (courtDetail) {
      court = {
        id: courtDetail.id,
        name: courtDetail.name,
        slug: courtDetail.slug || null,
        type: courtDetail.type || null,
        surface: courtDetail.surface || null,
        indoor: courtDetail.indoor || false,
        defaultPriceCents: courtDetail.defaultPriceCents,
        available: true,
      } as WizardCourt;
    }
  }

  return { organization, club, court };
}

/**
 * Hook for initializing wizard with predefined organization and club data
 * Fetches and resolves the full objects from stores if IDs are provided
 * 
 * Strategy:
 * 1. First try to get data synchronously from stores (no flicker if data exists)
 * 2. If data is missing, fetch asynchronously
 */
export function useWizardPredefinedData({
  isOpen,
  predefinedData,
}: UseWizardPredefinedDataOptions): UseWizardPredefinedDataReturn {
  // Try to get data synchronously from stores immediately
  const initialData = useMemo(() => {
    if (!isOpen || !predefinedData) {
      return { organization: null, club: null, court: null };
    }
    return getPredefinedDataFromStores(predefinedData);
  }, [isOpen, predefinedData]);

  const [predefinedOrganization, setPredefinedOrganization] = 
    useState<WizardOrganization | null>(initialData.organization);
  const [predefinedClub, setPredefinedClub] = useState<WizardClub | null>(initialData.club);
  const [predefinedCourt, setPredefinedCourt] = useState<WizardCourt | null>(initialData.court);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only initialize once when modal opens
    if (!isOpen || hasInitialized) {
      return;
    }

    const initializePredefinedData = async () => {
      // Check if we need to fetch any data
      const needsFetch = 
        (predefinedData?.organizationId && !predefinedOrganization) ||
        (predefinedData?.clubId && !predefinedClub) ||
        (predefinedData?.courtId && !predefinedCourt);

      if (!needsFetch) {
        // All data is already available synchronously
        setHasInitialized(true);
        return;
      }

      setIsLoading(true);

      try {
        // Only fetch data that's missing
        const [orgToSet, clubToSet, courtToSet] = await Promise.all([
          // Initialize organization if predefined and not already loaded
          predefinedData?.organizationId && !predefinedOrganization
            ? (async () => {
                const organizationId = predefinedData.organizationId;
                if (!organizationId) return null;

                const orgStore = useOrganizationStore.getState();
                const fetchOrganizations = orgStore.fetchOrganizations;

                try {
                  await fetchOrganizations();
                  return useOrganizationStore
                    .getState()
                    .getOrganizationById(organizationId) || null;
                } catch {
                  // Handle error silently as the organization might not be accessible
                  return null;
                }
              })()
            : Promise.resolve(predefinedOrganization),

          // Initialize club if predefined and not already loaded
          predefinedData?.clubId && !predefinedClub
            ? (async () => {
                const clubId = predefinedData.clubId;
                if (!clubId) return null;

                const clubStore = useClubStore.getState();
                const fetchClubsIfNeeded = clubStore.fetchClubsIfNeeded;

                try {
                  await fetchClubsIfNeeded();
                  return useClubStore.getState().getClubById(clubId) || null;
                } catch {
                  // Handle error silently as the club might not be accessible
                  return null;
                }
              })()
            : Promise.resolve(predefinedClub),

          // Initialize court if predefined and not already loaded
          predefinedData?.courtId && !predefinedCourt
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
            : Promise.resolve(predefinedCourt),
        ]);

        if (orgToSet && orgToSet !== predefinedOrganization) {
          setPredefinedOrganization(orgToSet);
        }

        if (clubToSet && clubToSet !== predefinedClub) {
          setPredefinedClub(clubToSet);
        }

        if (courtToSet && courtToSet !== predefinedCourt) {
          setPredefinedCourt(courtToSet);
        }
      } finally {
        setIsLoading(false);
        setHasInitialized(true);
      }
    };

    initializePredefinedData();
  }, [isOpen, hasInitialized, predefinedData?.organizationId, predefinedData?.clubId, predefinedData?.courtId, predefinedOrganization, predefinedClub, predefinedCourt]);

  // Reset when modal closes  
  useEffect(() => {
    // Reset initialization state when modal is no longer open
    if (!isOpen) {
      if (hasInitialized) {
        setHasInitialized(false);
      }
      // Reset to check store again on next open
      const freshData = getPredefinedDataFromStores(predefinedData);
      setPredefinedOrganization(freshData.organization);
      setPredefinedClub(freshData.club);
      setPredefinedCourt(freshData.court);
    }
  }, [isOpen, hasInitialized, predefinedData]);

  return {
    predefinedOrganization,
    predefinedClub,
    predefinedCourt,
    isLoading,
  };
}
