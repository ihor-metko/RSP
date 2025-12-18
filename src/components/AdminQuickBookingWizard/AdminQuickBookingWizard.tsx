"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { Step1Organization } from "./Step1Organization";
import { Step2Club } from "./Step2Club";
import { Step3DateTime } from "./Step3DateTime";
import { Step4Courts } from "./Step4Courts";
import { Step5User } from "./Step5User";
import { Step6Confirmation } from "./Step6Confirmation";
import { WizardStepIndicator, WizardNavigationButtons } from "./components";
import {
  useWizardOrganizations,
  useWizardClubs,
  useWizardUsers,
  useWizardCourts,
  useWizardNavigation,
  useWizardSubmit,
  useWizardPredefinedData,
} from "./hooks";
import {
  AdminQuickBookingWizardProps,
  WizardState,
  WizardOrganization,
  WizardClub,
  WizardUser,
  WizardCourt,
  getTodayDateString,
  getFirstVisibleStepId,
} from "./types";
import "./AdminQuickBookingWizard.css";

const MINUTES_PER_HOUR = 60;

export function AdminQuickBookingWizard({
  isOpen,
  onClose,
  onBookingComplete,
  predefinedData,
  adminType,
}: AdminQuickBookingWizardProps) {
  const t = useTranslations();

  const [state, setState] = useState<WizardState>(() => {
    const firstStepId = getFirstVisibleStepId(adminType, predefinedData);
    return {
      currentStep: firstStepId,
      adminType,
      stepOrganization: {
        selectedOrganizationId: predefinedData?.organizationId || null,
        selectedOrganization: null,
      },
      stepClub: {
        selectedClubId: predefinedData?.clubId || null,
        selectedClub: null,
      },
      stepUser: {
        selectedUserId: predefinedData?.userId || null,
        selectedUser: null,
        isCreatingNewUser: false,
        newUserName: "",
        newUserEmail: "",
        isGuestBooking: false,
        guestName: "",
      },
      stepDateTime: {
        date: predefinedData?.date || getTodayDateString(),
        startTime: predefinedData?.startTime || "10:00",
        duration: predefinedData?.duration || MINUTES_PER_HOUR,
      },
      stepCourt: {
        selectedCourtId: predefinedData?.courtId || null,
        selectedCourt: null,
      },
      stepConfirmation: {
        notes: "",
      },
      availableOrganizations: [],
      availableClubs: [],
      availableUsers: [],
      availableCourts: [],
      isLoadingOrganizations: false,
      isLoadingClubs: false,
      isLoadingUsers: false,
      isLoadingCourts: false,
      organizationsError: null,
      clubsError: null,
      usersError: null,
      courtsError: null,
      isSubmitting: false,
      submitError: null,
      isComplete: false,
      bookingId: null,
    };
  });

  // Use custom hooks for data fetching and state management
  const { predefinedOrganization, predefinedClub } = useWizardPredefinedData({
    isOpen,
    predefinedData,
  });

  const { organizations, isLoading: isLoadingOrgs, error: orgError } = useWizardOrganizations({
    isOpen,
    currentStep: state.currentStep,
    adminType,
    predefinedData,
  });

  const { clubs, isLoading: isLoadingClubs, error: clubsError } = useWizardClubs({
    isOpen,
    currentStep: state.currentStep,
    adminType,
    selectedOrganizationId: state.stepOrganization.selectedOrganizationId,
    predefinedData,
  });

  const { users, isLoading: isLoadingUsers, error: usersError, createUser } = useWizardUsers({
    isOpen,
    currentStep: state.currentStep,
    predefinedData,
  });

  const { courts, isLoading: isLoadingCourts, error: courtsError, fetchCourts } = useWizardCourts({
    clubId: state.stepClub.selectedClubId,
    dateTime: state.stepDateTime,
  });

  const navigation = useWizardNavigation({
    currentStep: state.currentStep,
    adminType,
    predefinedData,
    state,
  });

  const {
    isSubmitting,
    submitError,
    isComplete,
    bookingId,
    submitBooking,
  } = useWizardSubmit({
    state,
    onSuccess: (bookingId, courtId, date, startTime, endTime) => {
      onBookingComplete?.(bookingId, courtId, date, startTime, endTime);
      onClose();
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      const firstStepId = getFirstVisibleStepId(adminType, predefinedData);
      setState({
        currentStep: firstStepId,
        adminType,
        stepOrganization: {
          selectedOrganizationId: predefinedData?.organizationId || null,
          selectedOrganization: null,
        },
        stepClub: {
          selectedClubId: predefinedData?.clubId || null,
          selectedClub: null,
        },
        stepUser: {
          selectedUserId: predefinedData?.userId || null,
          selectedUser: null,
          isCreatingNewUser: false,
          newUserName: "",
          newUserEmail: "",
          isGuestBooking: false,
          guestName: "",
        },
        stepDateTime: {
          date: predefinedData?.date || getTodayDateString(),
          startTime: predefinedData?.startTime || "10:00",
          duration: predefinedData?.duration || MINUTES_PER_HOUR,
        },
        stepCourt: {
          selectedCourtId: predefinedData?.courtId || null,
          selectedCourt: null,
        },
        stepConfirmation: {
          notes: "",
        },
        availableOrganizations: [],
        availableClubs: [],
        availableUsers: [],
        availableCourts: [],
        isLoadingOrganizations: false,
        isLoadingClubs: false,
        isLoadingUsers: false,
        isLoadingCourts: false,
        organizationsError: null,
        clubsError: null,
        usersError: null,
        courtsError: null,
        isSubmitting: false,
        submitError: null,
        isComplete: false,
        bookingId: null,
      });
    }
  }, [isOpen, adminType, predefinedData]);

  // Initialize predefined organization and club objects when loaded
  useEffect(() => {
    if (predefinedOrganization) {
      setState((prev) => ({
        ...prev,
        stepOrganization: {
          selectedOrganizationId: predefinedOrganization.id,
          selectedOrganization: predefinedOrganization,
        },
      }));
    }
  }, [predefinedOrganization]);

  useEffect(() => {
    if (predefinedClub) {
      setState((prev) => ({
        ...prev,
        stepClub: {
          selectedClubId: predefinedClub.id,
          selectedClub: predefinedClub,
        },
        // Also add to availableClubs so Step2Club can display it
        availableClubs: [predefinedClub, ...prev.availableClubs.filter((c) => c.id !== predefinedClub.id)],
      }));
    }
  }, [predefinedClub]);

  // Sync hook data to state for display
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      availableOrganizations: organizations,
      isLoadingOrganizations: isLoadingOrgs,
      organizationsError: orgError,
    }));
  }, [organizations, isLoadingOrgs, orgError]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      availableClubs: clubs,
      isLoadingClubs,
      clubsError,
    }));
  }, [clubs, isLoadingClubs, clubsError]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      availableUsers: users,
      isLoadingUsers,
      usersError,
    }));
  }, [users, isLoadingUsers, usersError]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      availableCourts: courts,
      isLoadingCourts,
      courtsError,
    }));
  }, [courts, isLoadingCourts, courtsError]);

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      isSubmitting,
      submitError,
      isComplete,
      bookingId,
    }));
  }, [isSubmitting, submitError, isComplete, bookingId]);

  // Handler functions
  const handleSelectOrganization = useCallback((org: WizardOrganization) => {
    setState((prev) => ({
      ...prev,
      stepOrganization: {
        selectedOrganizationId: org.id,
        selectedOrganization: org,
      },
      // Reset club when org changes
      stepClub: {
        selectedClubId: null,
        selectedClub: null,
      },
      availableClubs: [],
    }));
  }, []);

  const handleSelectClub = useCallback((club: WizardClub) => {
    setState((prev) => ({
      ...prev,
      stepClub: {
        selectedClubId: club.id,
        selectedClub: club,
      },
      // Reset court when club changes
      stepCourt: {
        selectedCourtId: null,
        selectedCourt: null,
      },
      availableCourts: [],
    }));
  }, []);

  const handleSelectUser = useCallback((user: WizardUser) => {
    setState((prev) => ({
      ...prev,
      stepUser: {
        ...prev.stepUser,
        selectedUserId: user.id,
        selectedUser: user,
        isCreatingNewUser: false,
      },
    }));
  }, []);

  const handleToggleCreateNewUser = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stepUser: {
        ...prev.stepUser,
        isCreatingNewUser: !prev.stepUser.isCreatingNewUser,
        isGuestBooking: false,
        selectedUserId: prev.stepUser.isCreatingNewUser ? prev.stepUser.selectedUserId : null,
        selectedUser: prev.stepUser.isCreatingNewUser ? prev.stepUser.selectedUser : null,
      },
    }));
  }, []);

  const handleToggleGuest = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stepUser: {
        ...prev.stepUser,
        isGuestBooking: !prev.stepUser.isGuestBooking,
        isCreatingNewUser: false,
        selectedUserId: prev.stepUser.isGuestBooking ? prev.stepUser.selectedUserId : null,
        selectedUser: prev.stepUser.isGuestBooking ? prev.stepUser.selectedUser : null,
      },
    }));
  }, []);

  const handleNewUserChange = useCallback(
    (field: "name" | "email", value: string) => {
      setState((prev) => ({
        ...prev,
        stepUser: {
          ...prev.stepUser,
          [field === "name" ? "newUserName" : "newUserEmail"]: value,
        },
      }));
    },
    []
  );

  const handleGuestNameChange = useCallback((name: string) => {
    setState((prev) => ({
      ...prev,
      stepUser: {
        ...prev.stepUser,
        guestName: name,
      },
    }));
  }, []);

  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleCreateUser = useCallback(async () => {
    setIsCreatingUser(true);

    const newUser = await createUser(
      state.stepUser.newUserName,
      state.stepUser.newUserEmail
    );

    if (newUser) {
      setState((prev) => ({
        ...prev,
        stepUser: {
          selectedUserId: newUser.id,
          selectedUser: newUser,
          isCreatingNewUser: false,
          newUserName: "",
          newUserEmail: "",
          isGuestBooking: false,
          guestName: "",
        },
      }));
    }

    setIsCreatingUser(false);
  }, [state.stepUser.newUserName, state.stepUser.newUserEmail, createUser]);

  const handleDateTimeChange = useCallback(
    (data: Partial<typeof state.stepDateTime>) => {
      setState((prev) => ({
        ...prev,
        stepDateTime: { ...prev.stepDateTime, ...data },
        // Reset court selection when date/time changes
        stepCourt: { selectedCourtId: null, selectedCourt: null },
        availableCourts: [],
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSelectCourt = useCallback((court: WizardCourt) => {
    setState((prev) => ({
      ...prev,
      stepCourt: {
        selectedCourtId: court.id,
        selectedCourt: court,
      },
    }));
  }, []);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const nextStepId = navigation.getNextStep();

    if (nextStepId === null) {
      // Last step - submit
      await submitBooking();
      return;
    }

    // Fetch courts when moving to step 4
    if (nextStepId === 4) {
      setState((prev) => ({ ...prev, currentStep: nextStepId }));
      await fetchCourts();
    } else {
      setState((prev) => ({ ...prev, currentStep: nextStepId }));
    }
  }, [navigation, submitBooking, fetchCourts]);

  const handleBack = useCallback(() => {
    const prevStepId = navigation.getPreviousStep();

    if (prevStepId !== null) {
      setState((prev) => ({
        ...prev,
        currentStep: prevStepId,
        submitError: null,
      }));
    }
  }, [navigation]);

  // Computed values
  const totalPrice = useMemo(() => {
    if (state.stepCourt.selectedCourt?.priceCents !== undefined) {
      return state.stepCourt.selectedCourt.priceCents;
    }
    if (state.stepCourt.selectedCourt) {
      return Math.round(
        (state.stepCourt.selectedCourt.defaultPriceCents / MINUTES_PER_HOUR) *
        state.stepDateTime.duration
      );
    }
    return 0;
  }, [state.stepCourt.selectedCourt, state.stepDateTime.duration]);

  const handleClose = useCallback(() => {
    if (!state.isSubmitting) {
      onClose();
    }
  }, [state.isSubmitting, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("adminWizard.title")}
    >
      <div className="rsp-admin-wizard-modal">
        {/* Step Indicator */}
        <WizardStepIndicator
          steps={navigation.visibleSteps}
          currentStep={state.currentStep}
        />

        {/* Step Content */}
        <div className="rsp-admin-wizard-content">
          {state.currentStep === 1 && (
            <Step1Organization
              data={state.stepOrganization}
              organizations={state.availableOrganizations}
              isLoading={state.isLoadingOrganizations}
              error={state.organizationsError}
              onSelect={handleSelectOrganization}
            />
          )}

          {state.currentStep === 2 && (
            <Step2Club
              data={state.stepClub}
              clubs={state.availableClubs}
              isLoading={state.isLoadingClubs}
              error={state.clubsError}
              onSelect={handleSelectClub}
            />
          )}

          {state.currentStep === 3 && (
            <Step3DateTime
              data={state.stepDateTime}
              onChange={handleDateTimeChange}
              isLoading={false}
            />
          )}

          {state.currentStep === 4 && (
            <Step4Courts
              courts={state.availableCourts}
              selectedCourtId={state.stepCourt.selectedCourtId}
              onSelectCourt={handleSelectCourt}
              isLoading={state.isLoadingCourts}
              error={state.courtsError}
            />
          )}

          {state.currentStep === 5 && (
            <Step5User
              data={state.stepUser}
              users={state.availableUsers}
              isLoading={state.isLoadingUsers}
              error={state.usersError}
              onSelect={handleSelectUser}
              onToggleCreateNew={handleToggleCreateNewUser}
              onToggleGuest={handleToggleGuest}
              onNewUserChange={handleNewUserChange}
              onGuestNameChange={handleGuestNameChange}
              onCreateUser={handleCreateUser}
              isCreatingUser={isCreatingUser}
            />
          )}

          {state.currentStep === 6 && (
            <Step6Confirmation
              organization={state.stepOrganization.selectedOrganization}
              club={state.stepClub.selectedClub}
              user={state.stepUser.selectedUser}
              guestName={state.stepUser.isGuestBooking ? state.stepUser.guestName : null}
              dateTime={state.stepDateTime}
              court={state.stepCourt.selectedCourt}
              submitError={state.submitError}
              isComplete={state.isComplete}
              bookingId={state.bookingId}
              totalPrice={totalPrice}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {!state.isComplete && (
          <WizardNavigationButtons
            canProceed={navigation.canProceed}
            isFirstStep={navigation.isFirstStep}
            isLastStep={navigation.isLastStep}
            isSubmitting={state.isSubmitting}
            onBack={handleBack}
            onNext={handleNext}
            onCancel={onClose}
          />
        )}
      </div>
    </Modal>
  );
}
