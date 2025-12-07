"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { Step0SelectClub } from "./Step0SelectClub";
import { Step1DateTime } from "./Step1DateTime";
import { Step2Courts } from "./Step2Courts";
import { Step3Payment } from "./Step3Payment";
import { Step4Confirmation } from "./Step4Confirmation";
import {
  PlayerQuickBookingProps,
  PlayerQuickBookingState,
  PlayerBookingStep1Data,
  BookingCourt,
  BookingClub,
  PaymentMethod,
  getTodayDateString,
  calculateEndTime,
  determineVisibleSteps,
} from "./types";
import "./PlayerQuickBooking.css";

// Constants for price calculations
const MINUTES_PER_HOUR = 60;

export function PlayerQuickBooking({
  isOpen,
  onClose,
  onBookingComplete,
  preselectedClubId,
  preselectedCourtId,
  preselectedDateTime,
}: PlayerQuickBookingProps) {
  const t = useTranslations();

  // Determine visible steps based on preselected data
  const visibleSteps = useMemo(
    () => determineVisibleSteps(preselectedClubId, preselectedCourtId, preselectedDateTime),
    [preselectedClubId, preselectedCourtId, preselectedDateTime]
  );

  // Initialize state with preselected data
  const [state, setState] = useState<PlayerQuickBookingState>(() => {
    const initialDateTime = preselectedDateTime || {
      date: getTodayDateString(),
      startTime: "10:00",
      duration: MINUTES_PER_HOUR,
    };

    return {
      currentStep: visibleSteps[0]?.id || 0,
      step0: {
        selectedClubId: preselectedClubId || null,
        selectedClub: null,
      },
      step1: initialDateTime,
      step2: {
        selectedCourtId: preselectedCourtId || null,
        selectedCourt: null,
      },
      step3: {
        paymentMethod: null,
      },
      step4: {
        bookingId: null,
        confirmed: false,
      },
      availableClubs: [],
      availableCourts: [],
      isLoadingClubs: false,
      isLoadingCourts: false,
      clubsError: null,
      courtsError: null,
      estimatedPrice: null,
      isSubmitting: false,
      submitError: null,
    };
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      const initialDateTime = preselectedDateTime || {
        date: getTodayDateString(),
        startTime: "10:00",
        duration: MINUTES_PER_HOUR,
      };

      setState({
        currentStep: visibleSteps[0]?.id || 0,
        step0: {
          selectedClubId: preselectedClubId || null,
          selectedClub: null,
        },
        step1: initialDateTime,
        step2: {
          selectedCourtId: preselectedCourtId || null,
          selectedCourt: null,
        },
        step3: {
          paymentMethod: null,
        },
        step4: {
          bookingId: null,
          confirmed: false,
        },
        availableClubs: [],
        availableCourts: [],
        isLoadingClubs: false,
        isLoadingCourts: false,
        clubsError: null,
        courtsError: null,
        estimatedPrice: null,
        isSubmitting: false,
        submitError: null,
      });
    }
  }, [isOpen, preselectedClubId, preselectedCourtId, preselectedDateTime, visibleSteps]);

  // Fetch club data if preselected
  useEffect(() => {
    const fetchPreselectedClub = async () => {
      if (preselectedClubId && !state.step0.selectedClub) {
        try {
          const response = await fetch(`/api/clubs/${preselectedClubId}`);
          if (response.ok) {
            const data = await response.json();
            setState((prev) => ({
              ...prev,
              step0: {
                selectedClubId: preselectedClubId,
                selectedClub: {
                  id: data.id,
                  name: data.name,
                  slug: data.slug,
                  location: data.location,
                  city: data.city,
                  heroImage: data.heroImage,
                },
              },
            }));
          }
        } catch {
          // Silently fail - user can select club manually
        }
      }
    };

    if (isOpen && preselectedClubId) {
      fetchPreselectedClub();
    }
  }, [isOpen, preselectedClubId, state.step0.selectedClub]);

  // Fetch court data if preselected
  useEffect(() => {
    const fetchPreselectedCourt = async () => {
      if (preselectedCourtId && !state.step2.selectedCourt) {
        try {
          const response = await fetch(`/api/courts/${preselectedCourtId}`);
          if (response.ok) {
            const data = await response.json();
            setState((prev) => ({
              ...prev,
              step2: {
                selectedCourtId: preselectedCourtId,
                selectedCourt: {
                  id: data.id,
                  name: data.name,
                  slug: data.slug,
                  type: data.type,
                  surface: data.surface,
                  indoor: data.indoor,
                  defaultPriceCents: data.defaultPriceCents,
                },
              },
            }));
          }
        } catch {
          // Silently fail
        }
      }
    };

    if (isOpen && preselectedCourtId) {
      fetchPreselectedCourt();
    }
  }, [isOpen, preselectedCourtId, state.step2.selectedCourt]);

  // Fetch available clubs for step 0
  const fetchAvailableClubs = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoadingClubs: true,
      clubsError: null,
    }));

    try {
      const response = await fetch("/api/clubs");
      if (!response.ok) {
        setState((prev) => ({
          ...prev,
          isLoadingClubs: false,
          clubsError: t("auth.errorOccurred"),
        }));
        return;
      }

      const data = await response.json();
      const clubs: BookingClub[] = data.clubs || [];

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
  }, [t]);

  // Fetch available courts for step 2
  const fetchAvailableCourts = useCallback(async () => {
    const clubId = state.step0.selectedClubId || preselectedClubId;
    if (!clubId) return;

    setState((prev) => ({
      ...prev,
      isLoadingCourts: true,
      courtsError: null,
    }));

    try {
      const { date, startTime, duration } = state.step1;
      const params = new URLSearchParams({
        date,
        start: startTime,
        duration: duration.toString(),
      });

      const response = await fetch(
        `/api/clubs/${clubId}/available-courts?${params}`
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
      const courts: BookingCourt[] = data.availableCourts || [];

      // Fetch price timeline for each court to get resolved prices
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
            priceCents: Math.round((court.defaultPriceCents / MINUTES_PER_HOUR) * duration),
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
  }, [state.step0.selectedClubId, state.step1, preselectedClubId, t]);

  // Fetch estimated price when date/time/duration changes
  useEffect(() => {
    const fetchEstimatedPrice = async () => {
      const clubId = state.step0.selectedClubId || preselectedClubId;
      if (!clubId) return;

      const { date, startTime, duration } = state.step1;

      try {
        const params = new URLSearchParams({
          date,
          start: startTime,
          duration: duration.toString(),
        });
        const response = await fetch(
          `/api/clubs/${clubId}/available-courts?${params}`
        );

        if (response.ok) {
          const data = await response.json();
          const courts: BookingCourt[] = data.availableCourts || [];

          if (courts.length > 0) {
            const avgPrice = Math.round(
              courts.reduce((sum, c) => sum + (c.defaultPriceCents / MINUTES_PER_HOUR) * duration, 0) / courts.length
            );
            setState((prev) => ({ ...prev, estimatedPrice: avgPrice }));
          } else {
            setState((prev) => ({ ...prev, estimatedPrice: null }));
          }
        }
      } catch {
        // Silently fail for price estimation
      }
    };

    if (isOpen && (state.currentStep === 1 || (visibleSteps[0]?.id === 1 && state.currentStep === visibleSteps[0]?.id))) {
      fetchEstimatedPrice();
    }
  }, [isOpen, state.step0.selectedClubId, state.step1, state.currentStep, preselectedClubId, visibleSteps]);

  // Handle club selection
  const handleSelectClub = useCallback((club: BookingClub) => {
    setState((prev) => ({
      ...prev,
      step0: {
        selectedClubId: club.id,
        selectedClub: club,
      },
      // Reset dependent data
      availableCourts: [],
      step2: { selectedCourtId: null, selectedCourt: null },
    }));
  }, []);

  // Handle step 1 data changes
  const handleStep1Change = useCallback((data: Partial<PlayerBookingStep1Data>) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, ...data },
      // Reset court selection when date/time changes
      step2: { selectedCourtId: null, selectedCourt: null },
      availableCourts: [],
    }));
  }, []);

  // Handle court selection
  const handleSelectCourt = useCallback((court: BookingCourt) => {
    setState((prev) => ({
      ...prev,
      step2: {
        selectedCourtId: court.id,
        selectedCourt: court,
      },
    }));
  }, []);

  // Handle payment method selection
  const handleSelectPaymentMethod = useCallback((method: PaymentMethod) => {
    setState((prev) => ({
      ...prev,
      step3: { paymentMethod: method },
    }));
  }, []);

  // Submit booking
  const handleSubmit = useCallback(async () => {
    const { step1, step2, step3 } = state;
    const court = step2.selectedCourt;

    if (!court || !step3.paymentMethod) {
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    try {
      const startDateTime = `${step1.date}T${step1.startTime}:00.000Z`;
      const endTime = calculateEndTime(step1.startTime, step1.duration);
      const endDateTime = `${step1.date}T${endTime}:00.000Z`;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtId: court.id,
          startTime: startDateTime,
          endTime: endDateTime,
          userId: "current-user", // Will be resolved by the API from session
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

      // Move to confirmation step
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        currentStep: 4, // Always move to confirmation
        step4: {
          bookingId: data.bookingId,
          confirmed: true,
        },
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submitError: t("auth.errorOccurred"),
      }));
    }
  }, [state, t]);

  // Navigate to next step
  const handleNext = useCallback(async () => {
    const currentStepIndex = visibleSteps.findIndex((s) => s.id === state.currentStep);
    if (currentStepIndex === -1) return;

    const currentStepConfig = visibleSteps[currentStepIndex];

    // If current step is 0 (club selection), fetch clubs if needed
    if (currentStepConfig.id === 0 && state.availableClubs.length === 0 && !state.isLoadingClubs) {
      await fetchAvailableClubs();
    }

    // If moving to step 2 (courts), fetch available courts
    if (currentStepIndex + 1 < visibleSteps.length && visibleSteps[currentStepIndex + 1].id === 2) {
      setState((prev) => ({ ...prev, currentStep: visibleSteps[currentStepIndex + 1].id }));
      await fetchAvailableCourts();
      return;
    }

    // If current step is 3 (payment), submit booking
    if (currentStepConfig.id === 3) {
      await handleSubmit();
      return;
    }

    // Move to next step
    if (currentStepIndex + 1 < visibleSteps.length) {
      setState((prev) => ({ ...prev, currentStep: visibleSteps[currentStepIndex + 1].id }));
    }
  }, [state.currentStep, state.availableClubs, state.isLoadingClubs, visibleSteps, fetchAvailableClubs, fetchAvailableCourts, handleSubmit]);

  // Navigate to previous step
  const handleBack = useCallback(() => {
    const currentStepIndex = visibleSteps.findIndex((s) => s.id === state.currentStep);
    if (currentStepIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentStep: visibleSteps[currentStepIndex - 1].id,
        submitError: null,
      }));
    }
  }, [state.currentStep, visibleSteps]);

  // Computed values
  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 0:
        return !!state.step0.selectedClubId;
      case 1:
        return !!state.step1.date && !!state.step1.startTime && state.step1.duration > 0;
      case 2:
        return !!state.step2.selectedCourtId;
      case 3:
        return !!state.step3.paymentMethod && !state.isSubmitting;
      case 4:
        return true; // Confirmation step
      default:
        return false;
    }
  }, [state]);

  const totalPrice = useMemo(() => {
    if (state.step2.selectedCourt?.priceCents !== undefined) {
      return state.step2.selectedCourt.priceCents;
    }
    if (state.step2.selectedCourt) {
      return Math.round(
        (state.step2.selectedCourt.defaultPriceCents / MINUTES_PER_HOUR) * state.step1.duration
      );
    }
    return state.estimatedPrice || 0;
  }, [state.step2.selectedCourt, state.step1.duration, state.estimatedPrice]);

  const handleClose = () => {
    if (state.step4.confirmed && state.step4.bookingId) {
      // Notify parent of successful booking
      const endTime = calculateEndTime(state.step1.startTime, state.step1.duration);
      onBookingComplete?.(
        state.step4.bookingId,
        state.step2.selectedCourt!.id,
        state.step1.date,
        state.step1.startTime,
        endTime
      );
    }
    if (!state.isSubmitting) {
      onClose();
    }
  };

  // Load clubs on mount if step 0 is visible
  useEffect(() => {
    if (isOpen && visibleSteps[0]?.id === 0 && state.availableClubs.length === 0) {
      fetchAvailableClubs();
    }
  }, [isOpen, visibleSteps, state.availableClubs.length, fetchAvailableClubs]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("booking.playerQuickBooking.title")}
    >
      <div className="rsp-player-booking-modal">
        {/* Step Indicator */}
        {visibleSteps.length > 1 && state.currentStep !== 4 && (
          <nav className="rsp-wizard-steps" aria-label={t("wizard.progress")}>
            {visibleSteps.filter(s => s.id !== 4).map((step, index) => {
              const currentIndex = visibleSteps.findIndex((s) => s.id === state.currentStep);
              const stepIndex = visibleSteps.findIndex((s) => s.id === step.id);
              const isActive = state.currentStep === step.id;
              const isCompleted = currentIndex > stepIndex;

              return (
                <div
                  key={step.id}
                  className={`rsp-wizard-step ${
                    isActive ? "rsp-wizard-step--active" : ""
                  } ${isCompleted ? "rsp-wizard-step--completed" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="rsp-wizard-step-circle" aria-hidden="true">
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
                  <span className="rsp-wizard-step-label">
                    {t(`wizard.steps.${step.label}`)}
                  </span>
                </div>
              );
            })}
          </nav>
        )}

        {/* Step Content */}
        <div className="rsp-wizard-content">
          {state.currentStep === 0 && (
            <Step0SelectClub
              clubs={state.availableClubs}
              selectedClubId={state.step0.selectedClubId}
              onSelectClub={handleSelectClub}
              isLoading={state.isLoadingClubs}
              error={state.clubsError}
            />
          )}

          {state.currentStep === 1 && (
            <Step1DateTime
              data={state.step1}
              onChange={handleStep1Change}
              estimatedPrice={state.estimatedPrice}
              isLoading={false}
            />
          )}

          {state.currentStep === 2 && (
            <Step2Courts
              courts={state.availableCourts}
              selectedCourtId={state.step2.selectedCourtId}
              onSelectCourt={handleSelectCourt}
              isLoading={state.isLoadingCourts}
              error={state.courtsError}
            />
          )}

          {state.currentStep === 3 && (
            <Step3Payment
              club={state.step0.selectedClub}
              date={state.step1.date}
              startTime={state.step1.startTime}
              duration={state.step1.duration}
              court={state.step2.selectedCourt}
              totalPrice={totalPrice}
              selectedPaymentMethod={state.step3.paymentMethod}
              onSelectPaymentMethod={handleSelectPaymentMethod}
              isSubmitting={state.isSubmitting}
              submitError={state.submitError}
            />
          )}

          {state.currentStep === 4 && (
            <Step4Confirmation
              club={state.step0.selectedClub}
              date={state.step1.date}
              startTime={state.step1.startTime}
              duration={state.step1.duration}
              court={state.step2.selectedCourt}
              totalPrice={totalPrice}
              bookingId={state.step4.bookingId}
              onClose={handleClose}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {state.currentStep !== 4 && (
          <div className="rsp-wizard-nav">
            <button
              type="button"
              className="rsp-wizard-nav-btn rsp-wizard-nav-btn--back"
              onClick={visibleSteps.findIndex((s) => s.id === state.currentStep) === 0 ? onClose : handleBack}
              disabled={state.isSubmitting}
            >
              {visibleSteps.findIndex((s) => s.id === state.currentStep) === 0 ? t("common.cancel") : (
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
              className="rsp-wizard-nav-btn rsp-wizard-nav-btn--next"
              onClick={handleNext}
              disabled={!canProceed}
              aria-busy={state.isSubmitting}
            >
              {state.isSubmitting ? (
                <>
                  <span className="rsp-wizard-spinner" aria-hidden="true" />
                  {t("common.processing")}
                </>
              ) : state.currentStep === 3 ? (
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
