"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";
import { useCourtAvailability } from "@/hooks/useCourtAvailability";
import { Step0SelectClub } from "./Step0SelectClub";
import { Step1DateTime } from "./Step1DateTime";
import { Step2Courts } from "./Step2Courts";
import { Step2_5Confirmation } from "./Step2_5Confirmation";
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
  DEFAULT_COURT_TYPE,
  wouldEndAfterClosing,
  DEFAULT_DURATION,
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
  preselectedClubData,
  availableCourtTypes,
}: PlayerQuickBookingProps) {
  const t = useTranslations();

  // Use centralized player club store with new idempotent method
  const clubsFromStore = usePlayerClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = usePlayerClubStore((state) => state.fetchClubsIfNeeded);

  // Real-time availability updates via WebSocket
  useCourtAvailability(
    preselectedClubId || null,
    () => {
      // Refetch courts when availability changes
      if (state.currentStep === 2 && (state.step0.selectedClubId || preselectedClubId)) {
        fetchAvailableCourts();
      }
    }
  );

  // Determine visible steps based on preselected data
  const visibleSteps = useMemo(
    () => determineVisibleSteps(preselectedClubId, preselectedCourtId, preselectedDateTime),
    [preselectedClubId, preselectedCourtId, preselectedDateTime]
  );

  // Track previous step1 values to prevent unnecessary API calls
  const prevStep1ParamsRef = useRef<string>("");
  const prevCourtsParamsRef = useRef<string>("");

  // Initialize state with preselected data
  const [state, setState] = useState<PlayerQuickBookingState>(() => {
    const initialDateTime: PlayerBookingStep1Data = preselectedDateTime
      ? { ...preselectedDateTime, courtType: preselectedDateTime.courtType || DEFAULT_COURT_TYPE }
      : {
        date: getTodayDateString(),
        startTime: "10:00",
        duration: DEFAULT_DURATION,
        courtType: DEFAULT_COURT_TYPE,
      };

    return {
      currentStep: visibleSteps[0]?.id || 0,
      step0: {
        selectedClubId: preselectedClubId || null,
        selectedClub: preselectedClubData || null,
      },
      step1: initialDateTime,
      step2: {
        selectedCourtId: preselectedCourtId || null,
        selectedCourt: null,
      },
      step3: {
        paymentMethod: null,
        reservationId: null,
        reservationExpiresAt: null,
      },
      step4: {
        bookingId: null,
        confirmed: false,
      },
      availableClubs: [],
      availableCourts: [],
      availableCourtTypes: availableCourtTypes || [],
      alternativeDurations: [],
      alternativeTimeSlots: [],
      isLoadingClubs: false,
      isLoadingCourts: false,
      isLoadingCourtTypes: false,
      clubsError: null,
      courtsError: null,
      estimatedPrice: null,
      estimatedPriceRange: null,
      isSubmitting: false,
      submitError: null,
    };
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset tracking refs
      prevStep1ParamsRef.current = "";
      prevCourtsParamsRef.current = "";
      
      const initialDateTime: PlayerBookingStep1Data = preselectedDateTime
        ? { ...preselectedDateTime, courtType: preselectedDateTime.courtType || DEFAULT_COURT_TYPE }
        : {
          date: getTodayDateString(),
          startTime: "10:00",
          duration: DEFAULT_DURATION,
          courtType: DEFAULT_COURT_TYPE,
        };

      setState({
        currentStep: visibleSteps[0]?.id || 0,
        step0: {
          selectedClubId: preselectedClubId || null,
          selectedClub: preselectedClubData || null,
        },
        step1: initialDateTime,
        step2: {
          selectedCourtId: preselectedCourtId || null,
          selectedCourt: null,
        },
        step3: {
          paymentMethod: null,
          reservationId: null,
          reservationExpiresAt: null,
        },
        step4: {
          bookingId: null,
          confirmed: false,
        },
        availableClubs: [],
        availableCourts: [],
        availableCourtTypes: availableCourtTypes || [],
        alternativeDurations: [],
        alternativeTimeSlots: [],
        isLoadingClubs: false,
        isLoadingCourts: false,
        isLoadingCourtTypes: false,
        clubsError: null,
        courtsError: null,
        estimatedPrice: null,
        estimatedPriceRange: null,
        isSubmitting: false,
        submitError: null,
      });
    }
  }, [isOpen, preselectedClubId, preselectedCourtId, preselectedDateTime, preselectedClubData, availableCourtTypes, visibleSteps]);

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

  // Memoize club mapping to avoid unnecessary re-renders
  const mappedClubs: BookingClub[] = useMemo(() =>
    clubsFromStore.map((club) => ({
      id: club.id,
      name: club.name,
      slug: null, // PlayerClub doesn't have slug field
      location: club.address?.formattedAddress || "",
      city: club.address?.city || undefined,
      bannerData: club.bannerData || undefined,
    })),
    [clubsFromStore]
  );

  // Fetch available clubs for step 0 using store
  const fetchAvailableClubs = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      isLoadingClubs: true,
      clubsError: null,
    }));

    try {
      // Use new idempotent method with inflight guard
      await fetchClubsIfNeeded();
      // Clubs will be synced via useEffect below
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingClubs: false,
        clubsError: t("auth.errorOccurred"),
      }));
    }
  }, [t, fetchClubsIfNeeded]);

  // Sync clubs from store to local state
  useEffect(() => {
    if (mappedClubs.length > 0) {
      setState((prev) => ({
        ...prev,
        availableClubs: mappedClubs,
        isLoadingClubs: false,
      }));
    }
  }, [mappedClubs]);

  // Update available court types when prop changes
  useEffect(() => {
    if (availableCourtTypes && availableCourtTypes.length > 0) {
      setState((prev) => {
        // If current selected court type is not available, switch to first available type
        // Falls back to DEFAULT_COURT_TYPE if array is unexpectedly empty
        const newCourtType = availableCourtTypes.includes(prev.step1.courtType)
          ? prev.step1.courtType
          : (availableCourtTypes[0] || DEFAULT_COURT_TYPE);

        return {
          ...prev,
          availableCourtTypes: availableCourtTypes,
          step1: {
            ...prev.step1,
            courtType: newCourtType,
          },
          isLoadingCourtTypes: false,
        };
      });
    }
  }, [availableCourtTypes]);

  // Fetch available courts for step 2
  const fetchAvailableCourts = useCallback(async () => {
    const clubId = state.step0.selectedClubId || preselectedClubId;
    if (!clubId) return;

    const { date, startTime, duration, courtType } = state.step1;
    
    // Create a unique key for current parameters to prevent redundant requests
    const currentParams = `${clubId}-${date}-${startTime}-${duration}-${courtType}`;
    
    // Skip if parameters haven't changed
    if (prevCourtsParamsRef.current === currentParams) {
      return;
    }
    
    // Update the reference
    prevCourtsParamsRef.current = currentParams;

    setState((prev) => ({
      ...prev,
      isLoadingCourts: true,
      courtsError: null,
    }));

    try {
      const params = new URLSearchParams({
        date,
        start: startTime,
        duration: duration.toString(),
        courtType,
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
      const alternativeTimeSlots = data.alternativeTimeSlots || [];
      const alternativeDurations = data.alternativeDurations || [];

      // Mark courts as available (priceCents comes from API response)
      const courtsWithAvailability = courts.map(court => ({
        ...court,
        available: true,
      }));

      setState((prev) => ({
        ...prev,
        availableCourts: courtsWithAvailability,
        alternativeTimeSlots,
        alternativeDurations,
        isLoadingCourts: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingCourts: false,
        courtsError: t("auth.errorOccurred"),
      }));
    }
    // Destructure step1 properties to avoid object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.step0.selectedClubId, state.step1.date, state.step1.startTime, state.step1.duration, state.step1.courtType, preselectedClubId, t]);

  // Fetch estimated price when date/time/duration changes
  useEffect(() => {
    const fetchEstimatedPrice = async () => {
      const clubId = state.step0.selectedClubId || preselectedClubId;
      if (!clubId) return;

      const { date, startTime, duration, courtType } = state.step1;
      
      // Create a unique key for current parameters to prevent redundant requests
      const currentParams = `${clubId}-${date}-${startTime}-${duration}-${courtType}`;
      
      // Skip if parameters haven't changed
      if (prevStep1ParamsRef.current === currentParams) {
        return;
      }
      
      // Update the reference
      prevStep1ParamsRef.current = currentParams;

      try {
        const params = new URLSearchParams({
          date,
          start: startTime,
          duration: duration.toString(),
          courtType,
        });
        const response = await fetch(
          `/api/clubs/${clubId}/available-courts?${params}`
        );

        if (response.ok) {
          const data = await response.json();
          const courts: BookingCourt[] = data.availableCourts || [];

          if (courts.length > 0) {
            // Use resolved prices from the API (priceCents includes court price rules)
            // API should always provide priceCents for each court
            const prices = courts.map(c => {
              if (c.priceCents == null) {
                console.warn(`Court ${c.id} missing priceCents, using default price`);
                // Fallback: calculate price for the duration using the same formula as getResolvedPriceForSlot
                // priceCents from API already includes duration, so fallback must too
                return Math.round((c.defaultPriceCents / MINUTES_PER_HOUR) * duration);
              }
              return c.priceCents;
            });
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

            setState((prev) => ({
              ...prev,
              estimatedPrice: avgPrice,
              estimatedPriceRange: { min: minPrice, max: maxPrice }
            }));
          } else {
            setState((prev) => ({
              ...prev,
              estimatedPrice: null,
              estimatedPriceRange: null
            }));
          }
        }
      } catch {
        // Silently fail for price estimation
      }
    };

    if (isOpen && (state.currentStep === 1 || (visibleSteps[0]?.id === 1 && state.currentStep === visibleSteps[0]?.id))) {
      fetchEstimatedPrice();
    }
    // Destructure step1 properties to avoid object reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state.step0.selectedClubId, state.step1.date, state.step1.startTime, state.step1.duration, state.step1.courtType, state.currentStep, preselectedClubId]);

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

  // Handle alternative time slot selection
  const handleSelectAlternativeTime = useCallback(async (startTime: string) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, startTime },
      // Reset court selection
      step2: { selectedCourtId: null, selectedCourt: null },
      availableCourts: [],
      alternativeTimeSlots: [],
      alternativeDurations: [],
      isLoadingCourts: true,
    }));

    // Wait a tick for state to update, then fetch courts with new time
    // We need to refetch after state update to ensure the new time is used
    setTimeout(() => {
      fetchAvailableCourts();
    }, 0);
  }, [fetchAvailableCourts]);

  // Handle alternative duration selection
  const handleSelectAlternativeDuration = useCallback(async (duration: number) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, duration },
      // Reset court selection
      step2: { selectedCourtId: null, selectedCourt: null },
      availableCourts: [],
      alternativeTimeSlots: [],
      alternativeDurations: [],
      isLoadingCourts: true,
    }));

    // Wait a tick for state to update, then fetch courts with new duration
    setTimeout(() => {
      fetchAvailableCourts();
    }, 0);
  }, [fetchAvailableCourts]);

  // Handle payment method selection
  const handleSelectPaymentMethod = useCallback((method: PaymentMethod) => {
    setState((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        paymentMethod: method,
      },
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
    setState((currentState) => {
      const currentStepIndex = visibleSteps.findIndex((s) => s.id === currentState.currentStep);
      if (currentStepIndex === -1) return currentState;

      const currentStepConfig = visibleSteps[currentStepIndex];

      // If current step is 0 (club selection), fetch clubs if needed
      if (currentStepConfig.id === 0 && currentState.availableClubs.length === 0 && !currentState.isLoadingClubs) {
        fetchAvailableClubs();
        return currentState;
      }

      // If moving to step 2 (courts), only fetch if we don't have courts data already
      if (currentStepIndex + 1 < visibleSteps.length && visibleSteps[currentStepIndex + 1].id === 2) {
        // Only fetch if we don't have courts for the current selection
        if (currentState.availableCourts.length === 0 && currentState.alternativeTimeSlots.length === 0 && !currentState.isLoadingCourts) {
          fetchAvailableCourts();
        }
        return { ...currentState, currentStep: visibleSteps[currentStepIndex + 1].id };
      }

      // If current step is 3 (payment), submit booking
      if (currentStepConfig.id === 3) {
        handleSubmit();
        return currentState;
      }

      // Move to next step
      if (currentStepIndex + 1 < visibleSteps.length) {
        return { ...currentState, currentStep: visibleSteps[currentStepIndex + 1].id };
      }

      return currentState;
    });
  }, [visibleSteps, fetchAvailableClubs, fetchAvailableCourts, handleSubmit]);

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
      case 1: {
        const hasBasicData = !!state.step1.date && !!state.step1.startTime && state.step1.duration > 0;
        if (!hasBasicData) return false;

        // Check if booking would end after closing time
        const endsAfterClosing = wouldEndAfterClosing(
          state.step1.date,
          state.step1.startTime,
          state.step1.duration,
          state.step0.selectedClub?.businessHours
        );

        return !endsAfterClosing;
      }
      case 2:
        return !!state.step2.selectedCourtId;
      case 2.5:
        // Confirmation step - just verify selection before proceeding to payment
        return !!state.step2.selectedCourtId && !!state.step2.selectedCourt;
      case 3:
        return !!state.step3.paymentMethod && !state.isSubmitting && !!state.step3.reservationId;
      case 4:
        return true; // Final confirmation step
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
                  className={`rsp-wizard-step ${isActive ? "rsp-wizard-step--active" : ""
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
              estimatedPriceRange={state.estimatedPriceRange}
              isLoading={state.isLoadingCourtTypes}
              availableCourtTypes={state.availableCourtTypes}
              businessHours={state.step0.selectedClub?.businessHours}
            />
          )}

          {state.currentStep === 2 && (
            <Step2Courts
              courts={state.availableCourts}
              selectedCourtId={state.step2.selectedCourtId}
              onSelectCourt={handleSelectCourt}
              isLoading={state.isLoadingCourts}
              error={state.courtsError}
              alternativeDurations={state.alternativeDurations}
              onSelectAlternativeDuration={handleSelectAlternativeDuration}
              alternativeTimeSlots={state.alternativeTimeSlots}
              onSelectAlternativeTime={handleSelectAlternativeTime}
            />
          )}

          {state.currentStep === 2.5 && (
            <Step2_5Confirmation
              club={state.step0.selectedClub}
              date={state.step1.date}
              startTime={state.step1.startTime}
              duration={state.step1.duration}
              court={state.step2.selectedCourt}
              totalPrice={totalPrice}
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
              onReservationCreated={(reservationId, expiresAt) => {
                setState((prev) => ({
                  ...prev,
                  step3: {
                    ...prev.step3,
                    reservationId,
                    reservationExpiresAt: expiresAt,
                  },
                }));
              }}
              onReservationExpired={() => {
                setState((prev) => ({
                  ...prev,
                  submitError: t("booking.reservationExpired"),
                }));
              }}
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
