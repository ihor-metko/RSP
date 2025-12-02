"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { Step1DateTime } from "./Step1DateTime";
import { Step2Courts } from "./Step2Courts";
import { Step3Payment } from "./Step3Payment";
import {
  QuickBookingWizardProps,
  WizardState,
  WizardStep1Data,
  WizardCourt,
  PaymentMethod,
  WIZARD_STEPS,
  getTodayDateString,
  calculateEndTime,
} from "./types";
import "./QuickBookingWizard.css";

// Constants for price calculations
const MINUTES_PER_HOUR = 60;

const initialState: WizardState = {
  currentStep: 1,
  step1: {
    date: getTodayDateString(),
    startTime: "10:00",
    duration: MINUTES_PER_HOUR, // Default 1 hour
  },
  step2: {
    selectedCourtId: null,
    selectedCourt: null,
  },
  step3: {
    paymentMethod: null,
  },
  availableCourts: [],
  isLoadingCourts: false,
  courtsError: null,
  estimatedPrice: null,
  isSubmitting: false,
  submitError: null,
  isComplete: false,
  bookingId: null,
};

export function QuickBookingWizard({
  clubId,
  isOpen,
  onClose,
  onBookingComplete,
}: QuickBookingWizardProps) {
  const t = useTranslations();
  const [state, setState] = useState<WizardState>(initialState);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setState(initialState);
    }
  }, [isOpen]);

  // Fetch estimated price when date/time/duration changes
  useEffect(() => {
    const fetchEstimatedPrice = async () => {
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
          const courts: WizardCourt[] = data.availableCourts || [];
          
          // Get average price across available courts
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

    if (isOpen && state.currentStep === 1) {
      fetchEstimatedPrice();
    }
  }, [isOpen, clubId, state.step1, state.currentStep]);

  // Fetch available courts when moving to step 2
  const fetchAvailableCourts = useCallback(async () => {
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
      const courts: WizardCourt[] = data.availableCourts || [];

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
  }, [clubId, state.step1, t]);

  // Handle step 1 data changes
  const handleStep1Change = useCallback((data: Partial<WizardStep1Data>) => {
    setState((prev) => ({
      ...prev,
      step1: { ...prev.step1, ...data },
      // Reset court selection when date/time changes
      step2: { selectedCourtId: null, selectedCourt: null },
      availableCourts: [],
    }));
  }, []);

  // Handle court selection
  const handleSelectCourt = useCallback((court: WizardCourt) => {
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

    if (!step2.selectedCourt || !step3.paymentMethod) {
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
          courtId: step2.selectedCourt.id,
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
          step2.selectedCourt!.id,
          step1.date,
          step1.startTime,
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

  // Navigate to next step
  const handleNext = useCallback(async () => {
    if (state.currentStep === 1) {
      setState((prev) => ({ ...prev, currentStep: 2 }));
      await fetchAvailableCourts();
    } else if (state.currentStep === 2) {
      setState((prev) => ({ ...prev, currentStep: 3 }));
    } else if (state.currentStep === 3) {
      await handleSubmit();
    }
  }, [state.currentStep, fetchAvailableCourts, handleSubmit]);

  // Navigate to previous step
  const handleBack = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(1, prev.currentStep - 1),
      submitError: null,
    }));
  }, []);

  // Computed values
  const canProceed = useMemo(() => {
    switch (state.currentStep) {
      case 1:
        return !!state.step1.date && !!state.step1.startTime && state.step1.duration > 0;
      case 2:
        return !!state.step2.selectedCourtId;
      case 3:
        return !!state.step3.paymentMethod && !state.isSubmitting;
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
    if (!state.isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t("booking.quickBooking.title")}
    >
      <div className="rsp-wizard-modal">
        {/* Step Indicator */}
        <nav className="rsp-wizard-steps" aria-label={t("wizard.progress")}>
          {WIZARD_STEPS.map((step) => {
            const isActive = state.currentStep === step.id;
            const isCompleted = state.currentStep > step.id;

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
                    step.id
                  )}
                </div>
                <span className="rsp-wizard-step-label">
                  {t(`wizard.steps.${step.label}`)}
                </span>
              </div>
            );
          })}
        </nav>

        {/* Step Content */}
        <div className="rsp-wizard-content">
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
              date={state.step1.date}
              startTime={state.step1.startTime}
              duration={state.step1.duration}
              court={state.step2.selectedCourt}
              totalPrice={totalPrice}
              selectedPaymentMethod={state.step3.paymentMethod}
              onSelectPaymentMethod={handleSelectPaymentMethod}
              isSubmitting={state.isSubmitting}
              submitError={state.submitError}
              isComplete={state.isComplete}
              bookingId={state.bookingId}
            />
          )}
        </div>

        {/* Navigation Buttons */}
        {!state.isComplete && (
          <div className="rsp-wizard-nav">
            <button
              type="button"
              className="rsp-wizard-nav-btn rsp-wizard-nav-btn--back"
              onClick={state.currentStep === 1 ? onClose : handleBack}
              disabled={state.isSubmitting}
            >
              {state.currentStep === 1 ? t("common.cancel") : (
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
