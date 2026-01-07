"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";
import { useCourtAvailability } from "@/hooks/useCourtAvailability";
import { clubLocalToUTC, clubLocalToUTCTime } from "@/utils/dateTime";
import { getClubTimezone } from "@/constants/timezone";
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
  PaymentProviderInfo,
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
  resumePaymentMode = false,
  resumePaymentBooking,
}: PlayerQuickBookingProps) {
  const t = useTranslations();

  // Use centralized player club store with new idempotent method
  const clubsFromStore = usePlayerClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = usePlayerClubStore((state) => state.fetchClubsIfNeeded);

  // Real-time availability updates via WebSocket
  useCourtAvailability(
    preselectedClubId || resumePaymentBooking?.clubId || null,
    () => {
      // Refetch courts when availability changes
      if (state.currentStep === 2 && (state.step0.selectedClubId || preselectedClubId)) {
        fetchAvailableCourts();
      }
    }
  );

  // Determine visible steps based on preselected data or resume payment mode
  const visibleSteps = useMemo(
    () => determineVisibleSteps(
      preselectedClubId || resumePaymentBooking?.clubId,
      preselectedCourtId || resumePaymentBooking?.courtId,
      preselectedDateTime,
      resumePaymentMode
    ),
    [preselectedClubId, preselectedCourtId, preselectedDateTime, resumePaymentMode, resumePaymentBooking]
  );

  // Track previous step1 values to prevent unnecessary API calls
  const prevStep1ParamsRef = useRef<string>("");
  const prevCourtsParamsRef = useRef<string>("");

  // Track if a reservation request is in progress to prevent duplicates
  const isReservingRef = useRef<boolean>(false);

  // Initialize state with preselected data or resume payment data
  const [state, setState] = useState<PlayerQuickBookingState>(() => {
    // In resume payment mode, initialize from resumePaymentBooking
    if (resumePaymentMode && resumePaymentBooking) {
      const initialDateTime: PlayerBookingStep1Data = {
        date: resumePaymentBooking.date,
        startTime: resumePaymentBooking.startTime,
        duration: resumePaymentBooking.duration,
        courtType: resumePaymentBooking.courtType || DEFAULT_COURT_TYPE,
      };

      const initialClub: BookingClub = {
        id: resumePaymentBooking.clubId,
        name: resumePaymentBooking.clubName,
        slug: null,
        location: "",
        timezone: resumePaymentBooking.timezone || null,
      };

      const initialCourt: BookingCourt = {
        id: resumePaymentBooking.courtId,
        name: resumePaymentBooking.courtName,
        slug: null,
        type: null,
        surface: null,
        indoor: false,
        courtFormat: resumePaymentBooking.courtType || null,
        defaultPriceCents: resumePaymentBooking.price,
        priceCents: resumePaymentBooking.price,
      };

      return {
        currentStep: 3, // Start directly at payment step (step 3) in resume mode
        step0: {
          selectedClubId: resumePaymentBooking.clubId,
          selectedClub: initialClub,
        },
        step1: initialDateTime,
        step2: {
          selectedCourtId: resumePaymentBooking.courtId,
          selectedCourt: initialCourt,
        },
        step3: {
          paymentProvider: null,
          reservationId: resumePaymentBooking.bookingId, // Use existing booking ID
          reservationExpiresAt: resumePaymentBooking.reservationExpiresAt,
        },
        step4: {
          bookingId: null,
          confirmed: false,
        },
        availableClubs: [],
        availableCourts: [],
        availableCourtTypes: availableCourtTypes || [],
        availablePaymentProviders: [],
        alternativeDurations: [],
        alternativeTimeSlots: [],
        isLoadingClubs: false,
        isLoadingCourts: false,
        isLoadingCourtTypes: false,
        isLoadingPaymentProviders: false,
        clubsError: null,
        courtsError: null,
        paymentProvidersError: null,
        estimatedPrice: resumePaymentBooking.price,
        estimatedPriceRange: null,
        isSubmitting: false,
        submitError: null,
      };
    }

    // Normal mode initialization
    const initialDateTime: PlayerBookingStep1Data = preselectedDateTime
      ? { ...preselectedDateTime, courtType: preselectedDateTime.courtType || DEFAULT_COURT_TYPE }
      : {
        date: getTodayDateString(),
        startTime: "",
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
        paymentProvider: null,
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
      availablePaymentProviders: [],
      alternativeDurations: [],
      alternativeTimeSlots: [],
      isLoadingClubs: false,
      isLoadingCourts: false,
      isLoadingCourtTypes: false,
      isLoadingPaymentProviders: false,
      clubsError: null,
      courtsError: null,
      paymentProvidersError: null,
      estimatedPrice: null,
      estimatedPriceRange: null,
      isSubmitting: false,
      submitError: null,
    };
  });

  // Reset state when modal closes (only in normal mode, not resume payment)
  useEffect(() => {
    if (!isOpen && !resumePaymentMode) {
      // Reset tracking refs
      prevStep1ParamsRef.current = "";
      prevCourtsParamsRef.current = "";
      isReservingRef.current = false; // Reset reservation lock

      const initialDateTime: PlayerBookingStep1Data = preselectedDateTime
        ? { ...preselectedDateTime, courtType: preselectedDateTime.courtType || DEFAULT_COURT_TYPE }
        : {
          date: getTodayDateString(),
          startTime: "",
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
          paymentProvider: null,
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
        availablePaymentProviders: [],
        alternativeDurations: [],
        alternativeTimeSlots: [],
        isLoadingClubs: false,
        isLoadingCourts: false,
        isLoadingCourtTypes: false,
        isLoadingPaymentProviders: false,
        clubsError: null,
        courtsError: null,
        paymentProvidersError: null,
        estimatedPrice: null,
        estimatedPriceRange: null,
        isSubmitting: false,
        submitError: null,
      });
    }
  }, [isOpen, resumePaymentMode, preselectedClubId, preselectedCourtId, preselectedDateTime, preselectedClubData, availableCourtTypes, visibleSteps]);

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
      timezone: club.timezone || undefined,
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
    const selectedClub = state.step0.selectedClub || preselectedClubData;
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
      // Get club timezone (with fallback to default)
      const clubTimezone = getClubTimezone(selectedClub?.timezone);

      // Convert club local time to UTC time string (HH:MM format) for API
      const utcTimeString = clubLocalToUTCTime(date, startTime, clubTimezone);

      const params = new URLSearchParams({
        date,
        start: utcTimeString, // Send UTC time
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
  }, [state.step0.selectedClubId, state.step0.selectedClub, state.step1.date, state.step1.startTime, state.step1.duration, state.step1.courtType, preselectedClubId, preselectedClubData, t]);

  // Fetch available payment providers for a club
  const fetchPaymentProviders = useCallback(async () => {
    const clubId = state.step0.selectedClubId || preselectedClubId || resumePaymentBooking?.clubId;
    if (!clubId) return;

    setState((prev) => ({
      ...prev,
      isLoadingPaymentProviders: true,
      paymentProvidersError: null,
    }));

    try {
      const response = await fetch(`/api/clubs/${clubId}/payment-providers`);

      if (!response.ok) {
        setState((prev) => ({
          ...prev,
          isLoadingPaymentProviders: false,
          paymentProvidersError: t("auth.errorOccurred"),
        }));
        return;
      }

      const data = await response.json();
      const providers: PaymentProviderInfo[] = data.providers || [];

      setState((prev) => ({
        ...prev,
        availablePaymentProviders: providers,
        isLoadingPaymentProviders: false,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        isLoadingPaymentProviders: false,
        paymentProvidersError: t("auth.errorOccurred"),
      }));
    }
  }, [state.step0.selectedClubId, preselectedClubId, resumePaymentBooking, t]);

  // Fetch estimated price when date/time/duration changes
  useEffect(() => {
    const fetchEstimatedPrice = async () => {
      const clubId = state.step0.selectedClubId || preselectedClubId;
      const selectedClub = state.step0.selectedClub || preselectedClubData;
      if (!clubId) return;

      const { date, startTime, duration, courtType } = state.step1;

      // Don't fetch price if startTime is not selected
      if (!startTime) {
        setState((prev) => ({
          ...prev,
          estimatedPrice: null,
          estimatedPriceRange: null
        }));
        return;
      }

      // Create a unique key for current parameters to prevent redundant requests
      const currentParams = `${clubId}-${date}-${startTime}-${duration}-${courtType}`;

      // Skip if parameters haven't changed
      if (prevStep1ParamsRef.current === currentParams) {
        return;
      }

      // Update the reference
      prevStep1ParamsRef.current = currentParams;

      try {
        // Get club timezone (with fallback to default)
        const clubTimezone = getClubTimezone(selectedClub?.timezone);

        // Convert club local time to UTC time string (HH:MM format) for API
        const utcTimeString = clubLocalToUTCTime(date, startTime, clubTimezone);

        const params = new URLSearchParams({
          date,
          start: utcTimeString, // Send UTC time
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
  }, [isOpen, state.step0.selectedClubId, state.step0.selectedClub, state.step1.date, state.step1.startTime, state.step1.duration, state.step1.courtType, state.currentStep, preselectedClubId, preselectedClubData]);

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

    // Preload payment providers for better UX (non-blocking)
    // This improves user experience by loading provider data early
    const preloadProviders = async () => {
      try {
        const response = await fetch(`/api/clubs/${club.id}/payment-providers`);
        if (response.ok) {
          const data = await response.json();
          const providers: PaymentProviderInfo[] = data.providers || [];
          setState((prev) => ({
            ...prev,
            availablePaymentProviders: providers,
          }));
        }
      } catch {
        // Silently fail - providers will be fetched again when needed
      }
    };
    preloadProviders();
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

  // Handle payment provider selection
  const handleSelectPaymentProvider = useCallback((provider: PaymentProviderInfo) => {
    setState((prev) => ({
      ...prev,
      step3: {
        ...prev.step3,
        paymentProvider: provider,
      },
    }));
  }, []);

  // Create reservation when transitioning from Step 2.5 to Step 3
  const handleCreateReservation = useCallback(async () => {
    const { step0, step1, step2 } = state;
    const court = step2.selectedCourt;
    const selectedClub = step0.selectedClub || preselectedClubData;

    if (!court) {
      return false;
    }

    // Prevent duplicate reservation requests
    if (isReservingRef.current) {
      console.log("Reservation already in progress, skipping duplicate request");
      return false;
    }

    // If we already have a valid reservation, don't create another one
    if (state.step3.reservationId && state.step3.reservationExpiresAt) {
      const expiresAt = new Date(state.step3.reservationExpiresAt);
      if (expiresAt > new Date()) {
        console.log("Valid reservation already exists, skipping duplicate request");
        return true; // Proceed to payment step
      }
    }

    isReservingRef.current = true;
    setState((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    try {
      // Get club timezone (with fallback to default)
      const clubTimezone = getClubTimezone(selectedClub?.timezone);

      // Convert club local start time to UTC
      const startDateTime = clubLocalToUTC(step1.date, step1.startTime, clubTimezone);

      // Calculate end time in club timezone
      const endTimeLocal = calculateEndTime(step1.startTime, step1.duration);
      const endDateTime = clubLocalToUTC(step1.date, endTimeLocal, clubTimezone);

      const response = await fetch("/api/bookings/reserve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courtId: court.id,
          startTime: startDateTime, // Already in UTC ISO format
          endTime: endDateTime, // Already in UTC ISO format
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        // 409 Conflict - slot is already reserved
        // This could be from:
        // 1. Our own duplicate request (safe to proceed)
        // 2. Another user's reservation (should show error)

        // Check if we already have a reservation for this exact slot
        // If we don't have a reservationId yet, this is likely another user's reservation
        if (!state.step3.reservationId) {
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            submitError: t("booking.slotNoLongerAvailable"),
          }));
          return false;
        }

        // We have a reservationId, so this 409 is likely from our duplicate request
        // Proceed to payment step
        console.log("409 received but we have an existing reservation, proceeding to payment");
        setState((prev) => ({ ...prev, isSubmitting: false }));
        return true;
      }

      if (!response.ok) {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: data.error || t("auth.errorOccurred"),
        }));
        return false;
      }

      // Successful reservation created
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        step3: {
          ...prev.step3,
          reservationId: data.reservationId,
          reservationExpiresAt: data.expiresAt,
        },
      }));
      return true;
    } catch {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        submitError: t("auth.errorOccurred"),
      }));
      return false;
    } finally {
      isReservingRef.current = false;
    }
  }, [state, preselectedClubData, t]);

  // Initiate payment and redirect to payment gateway
  const handleSubmit = useCallback(async () => {
    const { step2, step3 } = state;
    const court = step2.selectedCourt;
    const reservationId = step3.reservationId;

    if (!court || !step3.paymentProvider || !reservationId) {
      return;
    }

    setState((prev) => ({ ...prev, isSubmitting: true, submitError: null }));

    try {
      // Call the new payment endpoint for existing reservations
      // This will:
      // 1. Validate the reservation belongs to the current user
      // 2. Resolve the correct payment account (club-level or org-level)
      // 3. Create a payment intent for the reservation
      // 4. Generate a checkout URL from the payment provider
      const response = await fetch(`/api/bookings/${reservationId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paymentProvider: step3.paymentProvider.id, // e.g., "WAYFORPAY"
        }),
      });

      const data = await response.json();

      if (response.status === 409) {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: data.error || t("auth.errorOccurred"),
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

      // Open payment gateway checkout URL in a new window/tab
      // This preserves the booking context and allows the user to return to this page
      // The payment webhook will update the booking status to PAID when payment succeeds
      // On return, user will be redirected to /player/bookings?payment=return in the payment window
      if (data.checkoutUrl) {
        const paymentWindow = window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
        
        if (!paymentWindow) {
          // Pop-up was blocked - show error message
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
            submitError: t("wizard.paymentWindowBlocked"),
          }));
        } else {
          // Payment window opened successfully
          // Reset submitting state so user can close the modal if needed
          setState((prev) => ({
            ...prev,
            isSubmitting: false,
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: t("auth.errorOccurred"),
        }));
      }
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
      fetchAvailableClubs();
      return;
    }

    // If moving to step 2 (courts), only fetch if we don't have courts data already
    if (currentStepIndex + 1 < visibleSteps.length && visibleSteps[currentStepIndex + 1].id === 2) {
      // Only fetch if we don't have courts for the current selection
      if (state.availableCourts.length === 0 && state.alternativeTimeSlots.length === 0 && !state.isLoadingCourts) {
        fetchAvailableCourts();
      }
      setState((prev) => ({ ...prev, currentStep: visibleSteps[currentStepIndex + 1].id }));
      return;
    }

    // If moving from step 2.5 (confirmation) to step 3 (payment), create reservation first
    if (currentStepConfig.id === 2.5 && currentStepIndex + 1 < visibleSteps.length && visibleSteps[currentStepIndex + 1].id === 3) {
      const reservationCreated = await handleCreateReservation();
      if (reservationCreated) {
        // Fetch payment providers before moving to payment step
        if (state.availablePaymentProviders.length === 0 && !state.isLoadingPaymentProviders) {
          await fetchPaymentProviders();
        }
        setState((prev) => ({ ...prev, currentStep: visibleSteps[currentStepIndex + 1].id }));
      }
      // If reservation failed, stay on current step (error will be shown)
      return;
    }

    // If current step is 3 (payment), submit booking
    if (currentStepConfig.id === 3) {
      handleSubmit();
      return;
    }

    // Move to next step
    if (currentStepIndex + 1 < visibleSteps.length) {
      setState((prev) => ({ ...prev, currentStep: visibleSteps[currentStepIndex + 1].id }));
    }
  }, [visibleSteps, state.currentStep, state.availableClubs.length, state.isLoadingClubs, state.availableCourts.length, state.alternativeTimeSlots.length, state.isLoadingCourts, state.availablePaymentProviders.length, state.isLoadingPaymentProviders, fetchAvailableClubs, fetchAvailableCourts, fetchPaymentProviders, handleCreateReservation, handleSubmit]);

  // Navigate to previous step
  const handleBack = useCallback(() => {
    // In resume payment mode, prevent navigation away from payment step
    if (resumePaymentMode) {
      return;
    }
    
    const currentStepIndex = visibleSteps.findIndex((s) => s.id === state.currentStep);
    if (currentStepIndex > 0) {
      setState((prev) => ({
        ...prev,
        currentStep: visibleSteps[currentStepIndex - 1].id,
        submitError: null,
      }));
    }
  }, [state.currentStep, visibleSteps, resumePaymentMode]);

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
      case 3: {
        // Check if payment provider is selected and reservation exists
        if (!state.step3.paymentProvider || !state.step3.reservationId || state.isSubmitting) {
          return false;
        }
        // Check if reservation is expired
        if (state.step3.reservationExpiresAt) {
          const now = new Date();
          const expiresAt = new Date(state.step3.reservationExpiresAt);
          if (expiresAt <= now) {
            return false; // Expired reservation, disable payment
          }
        }
        return true;
      }
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

  // Fetch payment providers when opening in resume payment mode
  useEffect(() => {
    if (isOpen && resumePaymentMode && state.availablePaymentProviders.length === 0) {
      fetchPaymentProviders();
    }
  }, [isOpen, resumePaymentMode, state.availablePaymentProviders.length, fetchPaymentProviders]);

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
              // In resume payment mode, steps before payment (steps 1, 2, 2.5) are locked
              const isLocked = resumePaymentMode && step.id !== 3;

              return (
                <div
                  key={step.id}
                  className={`rsp-wizard-step ${isActive ? "rsp-wizard-step--active" : ""
                    } ${isCompleted ? "rsp-wizard-step--completed" : ""} ${isLocked ? "rsp-wizard-step--locked" : ""}`}
                  aria-current={isActive ? "step" : undefined}
                >
                  <div className="rsp-wizard-step-circle" aria-hidden="true">
                    {isLocked ? (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    ) : isCompleted ? (
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
              clubTimezone={state.step0.selectedClub?.timezone}
              readOnlyMode={resumePaymentMode}
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
              readOnlyMode={resumePaymentMode}
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
              submitError={state.submitError}
              readOnlyMode={resumePaymentMode}
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
              availablePaymentProviders={state.availablePaymentProviders}
              selectedPaymentProvider={state.step3.paymentProvider}
              onSelectPaymentProvider={handleSelectPaymentProvider}
              isSubmitting={state.isSubmitting}
              isLoadingProviders={state.isLoadingPaymentProviders}
              submitError={state.submitError}
              providersError={state.paymentProvidersError}
              reservationExpiresAt={state.step3.reservationExpiresAt}
              onReservationExpired={() => {
                setState((prev) => ({
                  ...prev,
                  submitError: t("booking.reservationExpired"),
                }));
              }}
              readOnlyMode={resumePaymentMode}
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
            {/* In resume payment mode, only show Cancel button, not Back */}
            <button
              type="button"
              className="rsp-wizard-nav-btn rsp-wizard-nav-btn--back"
              onClick={resumePaymentMode || visibleSteps.findIndex((s) => s.id === state.currentStep) === 0 ? onClose : handleBack}
              disabled={state.isSubmitting}
            >
              {resumePaymentMode || visibleSteps.findIndex((s) => s.id === state.currentStep) === 0 ? t("common.cancel") : (
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
              ) : state.currentStep === 2.5 ? (
                t("wizard.confirmAndReserve")
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
