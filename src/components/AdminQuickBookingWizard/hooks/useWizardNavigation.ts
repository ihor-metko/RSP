/**
 * Custom hook for managing wizard navigation logic
 */
import { useCallback, useMemo } from "react";
import {
  getNextStepId,
  getPreviousStepId,
  getVisibleSteps,
  type AdminType,
  type PredefinedData,
  type WizardState,
} from "../types";

interface UseWizardNavigationOptions {
  currentStep: number;
  adminType: AdminType;
  predefinedData?: PredefinedData;
  state: WizardState;
}

interface UseWizardNavigationReturn {
  visibleSteps: ReturnType<typeof getVisibleSteps>;
  canProceed: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  getNextStep: () => number | null;
  getPreviousStep: () => number | null;
}

/**
 * Hook for managing wizard navigation and step validation
 * Determines which steps are visible and whether user can proceed
 */
export function useWizardNavigation({
  currentStep,
  adminType,
  predefinedData,
  state,
}: UseWizardNavigationOptions): UseWizardNavigationReturn {
  const visibleSteps = useMemo(
    () => getVisibleSteps(adminType, predefinedData),
    [adminType, predefinedData]
  );

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 1: // Organization
        return !!state.stepOrganization.selectedOrganizationId;
      case 2: // Club
        return !!state.stepClub.selectedClubId;
      case 3: // DateTime
        return (
          !!state.stepDateTime.date &&
          !!state.stepDateTime.startTime &&
          state.stepDateTime.duration > 0
        );
      case 4: // Court
        return !!state.stepCourt.selectedCourtId;
      case 5: // User
        return (
          !!state.stepUser.selectedUserId ||
          (state.stepUser.isGuestBooking && !!state.stepUser.guestName)
        );
      case 6: // Confirmation
        return !state.isSubmitting;
      default:
        return false;
    }
  }, [currentStep, state]);

  const getNextStep = useCallback(
    () => getNextStepId(currentStep, adminType, predefinedData),
    [currentStep, adminType, predefinedData]
  );

  const getPreviousStep = useCallback(
    () => getPreviousStepId(currentStep, adminType, predefinedData),
    [currentStep, adminType, predefinedData]
  );

  const isFirstStep = useMemo(
    () => getPreviousStepId(currentStep, adminType, predefinedData) === null,
    [currentStep, adminType, predefinedData]
  );

  const isLastStep = useMemo(
    () => getNextStepId(currentStep, adminType, predefinedData) === null,
    [currentStep, adminType, predefinedData]
  );

  return {
    visibleSteps,
    canProceed,
    isFirstStep,
    isLastStep,
    getNextStep,
    getPreviousStep,
  };
}
