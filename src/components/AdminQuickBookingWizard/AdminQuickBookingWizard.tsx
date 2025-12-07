"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { Step1Organization } from "./Step1Organization";
import { Step2Club } from "./Step2Club";
import { Step3User } from "./Step3User";
import { Step4DateTime } from "./Step4DateTime";
import { Step5Courts } from "./Step5Courts";
import { Step6Confirmation } from "./Step6Confirmation";
import {
  AdminQuickBookingWizardProps,
  WizardState,
  WizardOrganization,
  WizardClub,
  WizardUser,
  WizardCourt,
  getTodayDateString,
  getVisibleSteps,
  getNextStepId,
  getPreviousStepId,
  getFirstVisibleStepId,
  calculateEndTime,
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

  // Fetch organizations (Step 1)
  useEffect(() => {
    const fetchOrganizations = async () => {
      if (!isOpen || state.currentStep !== 1 || adminType !== "root_admin") {
        return;
      }

      if (predefinedData?.organizationId) {
        return; // Skip if org is predefined
      }

      setState((prev) => ({
        ...prev,
        isLoadingOrganizations: true,
        organizationsError: null,
      }));

      try {
        const response = await fetch("/api/admin/organizations");
        if (!response.ok) {
          throw new Error("Failed to fetch organizations");
        }
        const data = await response.json();
        const orgs: WizardOrganization[] = data.map(
          (org: { id: string; name: string; slug: string }) => ({
            id: org.id,
            name: org.name,
            slug: org.slug,
          })
        );
        setState((prev) => ({
          ...prev,
          availableOrganizations: orgs,
          isLoadingOrganizations: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoadingOrganizations: false,
          organizationsError: t("auth.errorOccurred"),
        }));
      }
    };

    fetchOrganizations();
  }, [isOpen, state.currentStep, adminType, predefinedData, t]);

  // Fetch clubs (Step 2)
  useEffect(() => {
    const fetchClubs = async () => {
      if (!isOpen || state.currentStep !== 2) {
        return;
      }

      if (predefinedData?.clubId) {
        return; // Skip if club is predefined
      }

      // For org admin and club admin, clubs are already filtered by managedIds
      // For root admin, filter by selected org if any

      setState((prev) => ({
        ...prev,
        isLoadingClubs: true,
        clubsError: null,
      }));

      try {
        const response = await fetch("/api/admin/clubs");
        if (!response.ok) {
          throw new Error("Failed to fetch clubs");
        }
        const data = await response.json();

        let clubs: WizardClub[] = data.map(
          (club: {
            id: string;
            name: string;
            organizationId: string;
            organization?: { name: string };
          }) => ({
            id: club.id,
            name: club.name,
            organizationId: club.organizationId || "",
            organizationName: club.organization?.name,
          })
        );

        // Filter by selected organization for root admin
        if (
          adminType === "root_admin" &&
          state.stepOrganization.selectedOrganizationId
        ) {
          clubs = clubs.filter(
            (c) => c.organizationId === state.stepOrganization.selectedOrganizationId
          );
        }

        setState((prev) => ({
          ...prev,
          availableClubs: clubs,
          isLoadingClubs: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoadingClubs: false,
          clubsError: t("auth.errorOccurred"),
        }));
      }
    };

    fetchClubs();
  }, [
    isOpen,
    state.currentStep,
    state.stepOrganization.selectedOrganizationId,
    adminType,
    predefinedData,
    t,
  ]);

  // Fetch users (Step 3)
  useEffect(() => {
    const fetchUsers = async () => {
      if (!isOpen || state.currentStep !== 3) {
        return;
      }

      if (predefinedData?.userId) {
        return; // Skip if user is predefined
      }

      setState((prev) => ({
        ...prev,
        isLoadingUsers: true,
        usersError: null,
      }));

      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        const users: WizardUser[] = data.map(
          (user: { id: string; name: string | null; email: string }) => ({
            id: user.id,
            name: user.name,
            email: user.email,
          })
        );
        setState((prev) => ({
          ...prev,
          availableUsers: users,
          isLoadingUsers: false,
        }));
      } catch {
        setState((prev) => ({
          ...prev,
          isLoadingUsers: false,
          usersError: t("auth.errorOccurred"),
        }));
      }
    };

    fetchUsers();
  }, [isOpen, state.currentStep, predefinedData, t]);

  // Fetch courts (Step 5)
  const fetchAvailableCourts = useCallback(async () => {
    if (!state.stepClub.selectedClubId) {
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoadingCourts: true,
      courtsError: null,
    }));

    try {
      const { date, startTime, duration } = state.stepDateTime;
      const params = new URLSearchParams({
        date,
        start: startTime,
        duration: duration.toString(),
      });

      const response = await fetch(
        `/api/clubs/${state.stepClub.selectedClubId}/available-courts?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          isLoadingCourts: false,
          courtsError: errorData.error || t("auth.errorOccurred"),
        }));
        return;
      }

      const data = await response.json();
      const courts: WizardCourt[] = data.availableCourts || [];

      // Fetch price timeline for each court
      const courtsWithPrices = await Promise.all(
        courts.map(async (court) => {
          try {
            const priceResponse = await fetch(
              `/api/courts/${court.id}/price-timeline?date=${date}`
            );
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              const segment = priceData.timeline.find(
                (seg: { start: string; end: string; priceCents: number }) =>
                  startTime >= seg.start && startTime < seg.end
              );
              const priceCents = segment
                ? Math.round((segment.priceCents / MINUTES_PER_HOUR) * duration)
                : Math.round((court.defaultPriceCents / MINUTES_PER_HOUR) * duration);
              return { ...court, priceCents, available: true };
            }
          } catch {
            // Ignore price fetch errors
          }
          return {
            ...court,
            priceCents: Math.round(
              (court.defaultPriceCents / MINUTES_PER_HOUR) * duration
            ),
            available: true,
          };
        })
      );

      setState((prev) => ({
        ...prev,
        availableCourts: courtsWithPrices,
        isLoadingCourts: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingCourts: false,
        courtsError: t("auth.errorOccurred"),
      }));
    }
  }, [state.stepClub.selectedClubId, state.stepDateTime, t]);

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
        selectedUserId: prev.stepUser.isCreatingNewUser ? prev.stepUser.selectedUserId : null,
        selectedUser: prev.stepUser.isCreatingNewUser ? prev.stepUser.selectedUser : null,
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

  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const handleCreateUser = useCallback(async () => {
    setIsCreatingUser(true);
    setState((prev) => ({ ...prev, usersError: null }));

    try {
      const response = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.stepUser.newUserName || null,
          email: state.stepUser.newUserEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setState((prev) => ({
          ...prev,
          usersError: errorData.error || t("auth.errorOccurred"),
        }));
        setIsCreatingUser(false);
        return;
      }

      const newUser: WizardUser = await response.json();

      setState((prev) => ({
        ...prev,
        stepUser: {
          selectedUserId: newUser.id,
          selectedUser: newUser,
          isCreatingNewUser: false,
          newUserName: "",
          newUserEmail: "",
        },
        availableUsers: [...prev.availableUsers, newUser],
      }));
      setIsCreatingUser(false);
    } catch {
      setState((prev) => ({
        ...prev,
        usersError: t("auth.errorOccurred"),
      }));
      setIsCreatingUser(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.stepUser.newUserName, state.stepUser.newUserEmail, t]);

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

  // Submit booking
  const handleSubmit = useCallback(async () => {
    const { stepUser, stepCourt, stepDateTime } = state;

    if (!stepUser.selectedUser || !stepCourt.selectedCourt) {
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    try {
      const startDateTime = `${stepDateTime.date}T${stepDateTime.startTime}:00.000Z`;
      const endTime = calculateEndTime(stepDateTime.startTime, stepDateTime.duration);
      const endDateTime = `${stepDateTime.date}T${endTime}:00.000Z`;

      const response = await fetch("/api/admin/bookings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: stepUser.selectedUser.id,
          courtId: stepCourt.selectedCourt.id,
          startTime: startDateTime,
          endTime: endDateTime,
          clubId: state.stepClub.selectedClubId,
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: t("booking.slotAlreadyBooked"),
        }));
        return;
      }

      if (!response.ok) {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: data.error || t("auth.errorOccurred"),
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isComplete: true,
        bookingId: data.bookingId,
      }));

      // Notify parent after short delay
      setTimeout(() => {
        onBookingComplete?.(
          data.bookingId,
          stepCourt.selectedCourt!.id,
          stepDateTime.date,
          stepDateTime.startTime,
          endTime
        );
        onClose();
      }, 2000);
    } catch {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submitError: t("auth.errorOccurred"),
      }));
    }
  }, [state, t, onBookingComplete, onClose]);

  // Navigation
  const handleNext = useCallback(async () => {
    const nextStepId = getNextStepId(
      state.currentStep,
      adminType,
      predefinedData
    );

    if (nextStepId === null) {
      // Last step - submit
      await handleSubmit();
      return;
    }

    // Fetch courts when moving to step 5
    if (nextStepId === 5) {
      setState((prev) => ({ ...prev, currentStep: nextStepId }));
      await fetchAvailableCourts();
    } else {
      setState((prev) => ({ ...prev, currentStep: nextStepId }));
    }
  }, [state.currentStep, adminType, predefinedData, handleSubmit, fetchAvailableCourts]);

  const handleBack = useCallback(() => {
    const prevStepId = getPreviousStepId(
      state.currentStep,
      adminType,
      predefinedData
    );

    if (prevStepId !== null) {
      setState((prev) => ({
        ...prev,
        currentStep: prevStepId,
        submitError: null,
      }));
    }
  }, [state.currentStep, adminType, predefinedData]);

  // Computed values
  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 1: // Organization
        return !!state.stepOrganization.selectedOrganizationId;
      case 2: // Club
        return !!state.stepClub.selectedClubId;
      case 3: // User
        return !!state.stepUser.selectedUserId;
      case 4: // DateTime
        return (
          !!state.stepDateTime.date &&
          !!state.stepDateTime.startTime &&
          state.stepDateTime.duration > 0
        );
      case 5: // Court
        return !!state.stepCourt.selectedCourtId;
      case 6: // Confirmation
        return !state.isSubmitting;
      default:
        return false;
    }
  }, [state]);

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

  const handleClose = () => {
    if (!state.isSubmitting) {
      onClose();
    }
  };

  const visibleSteps = getVisibleSteps(adminType, predefinedData);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("adminWizard.title")}
    >
      <div className="rsp-admin-wizard-modal">
        {/* Step Indicator */}
        <nav
          className="rsp-admin-wizard-steps"
          aria-label={t("wizard.progress")}
        >
          {visibleSteps.map((step, index) => {
            const isActive = state.currentStep === step.id;
            const isCompleted = visibleSteps.findIndex(
              (s) => s.id === state.currentStep
            ) > index;

            return (
              <div
                key={step.id}
                className={`rsp-admin-wizard-step-indicator ${
                  isActive ? "rsp-admin-wizard-step-indicator--active" : ""
                } ${
                  isCompleted ? "rsp-admin-wizard-step-indicator--completed" : ""
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                <div
                  className="rsp-admin-wizard-step-circle"
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20,6 9,17 4,12" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span className="rsp-admin-wizard-step-label">
                  {t(`adminWizard.steps.${step.label}`)}
                </span>
              </div>
            );
          })}
        </nav>

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
            <Step3User
              data={state.stepUser}
              users={state.availableUsers}
              isLoading={state.isLoadingUsers}
              error={state.usersError}
              onSelect={handleSelectUser}
              onToggleCreateNew={handleToggleCreateNewUser}
              onNewUserChange={handleNewUserChange}
              onCreateUser={handleCreateUser}
              isCreatingUser={isCreatingUser}
            />
          )}

          {state.currentStep === 4 && (
            <Step4DateTime
              data={state.stepDateTime}
              onChange={handleDateTimeChange}
              isLoading={false}
            />
          )}

          {state.currentStep === 5 && (
            <Step5Courts
              courts={state.availableCourts}
              selectedCourtId={state.stepCourt.selectedCourtId}
              onSelectCourt={handleSelectCourt}
              isLoading={state.isLoadingCourts}
              error={state.courtsError}
            />
          )}

          {state.currentStep === 6 && (
            <Step6Confirmation
              organization={state.stepOrganization.selectedOrganization}
              club={state.stepClub.selectedClub}
              user={state.stepUser.selectedUser}
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
          <div className="rsp-admin-wizard-nav">
            <button
              type="button"
              className="rsp-admin-wizard-nav-btn rsp-admin-wizard-nav-btn--back"
              onClick={
                getPreviousStepId(state.currentStep, adminType, predefinedData) ===
                null
                  ? onClose
                  : handleBack
              }
              disabled={state.isSubmitting}
            >
              {getPreviousStepId(
                state.currentStep,
                adminType,
                predefinedData
              ) === null ? (
                t("common.cancel")
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="15,18 9,12 15,6" />
                  </svg>
                  {t("common.back")}
                </>
              )}
            </button>

            <button
              type="button"
              className="rsp-admin-wizard-nav-btn rsp-admin-wizard-nav-btn--next"
              onClick={handleNext}
              disabled={!canProceed}
              aria-busy={state.isSubmitting}
            >
              {state.isSubmitting ? (
                <>
                  <span className="rsp-admin-wizard-spinner" aria-hidden="true" />
                  {t("common.processing")}
                </>
              ) : state.currentStep === 6 ? (
                t("wizard.confirmBooking")
              ) : (
                <>
                  {t("wizard.continue")}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <polyline points="9,18 15,12 9,6" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
