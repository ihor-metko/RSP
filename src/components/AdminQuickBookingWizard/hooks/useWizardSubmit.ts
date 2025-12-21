/**
 * Custom hook for managing booking submission logic
 */
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useBookingStore } from "@/stores/useBookingStore";
import { calculateEndTime, type WizardState } from "../types";
import { generateGuestEmail } from "../utils/generateGuestEmail";

const BOOKING_SUCCESS_DISPLAY_DELAY = 2000; // ms to display success message before closing

interface UseWizardSubmitOptions {
  state: WizardState;
  onSuccess: (
    bookingId: string,
    courtId: string,
    date: string,
    startTime: string,
    endTime: string
  ) => void;
}

interface UseWizardSubmitReturn {
  isSubmitting: boolean;
  submitError: string | null;
  isComplete: boolean;
  bookingId: string | null;
  submitBooking: () => Promise<void>;
}

/**
 * Hook for handling booking submission
 * Manages guest user creation and booking API calls
 */
export function useWizardSubmit({
  state,
  onSuccess,
}: UseWizardSubmitOptions): UseWizardSubmitReturn {
  const t = useTranslations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  
  // Use booking store for creating bookings
  const createBooking = useBookingStore((state) => state.createBooking);

  const submitBooking = useCallback(async () => {
    const { stepUser, stepCourt, stepDateTime, stepClub } = state;

    if ((!stepUser.selectedUser && !stepUser.isGuestBooking) || !stepCourt.selectedCourt) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // If guest booking, create a minimal user account first
      // NOTE: Intentional direct fetch - specialized endpoint for creating guest users
      // Guest user creation is a specialized operation for the booking wizard
      let userId = stepUser.selectedUser?.id;

      if (stepUser.isGuestBooking && stepUser.guestName) {
        // Create a guest user with a generated email
        const guestEmail = generateGuestEmail();
        
        const createUserResponse = await fetch("/api/admin/users/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: stepUser.guestName,
            email: guestEmail,
          }),
        });

        if (!createUserResponse.ok) {
          const errorData = await createUserResponse.json();
          setSubmitError(errorData.error || t("auth.errorOccurred"));
          setIsSubmitting(false);
          return;
        }

        const guestUser = await createUserResponse.json();
        userId = guestUser.id;
      }

      if (!userId) {
        setSubmitError(t("auth.errorOccurred"));
        setIsSubmitting(false);
        return;
      }

      const startDateTime = `${stepDateTime.date}T${stepDateTime.startTime}:00.000Z`;
      const endTime = calculateEndTime(stepDateTime.startTime, stepDateTime.duration);
      const endDateTime = `${stepDateTime.date}T${endTime}:00.000Z`;

      // Use booking store instead of direct fetch
      const data = await createBooking({
        userId,
        courtId: stepCourt.selectedCourt.id,
        startTime: startDateTime,
        endTime: endDateTime,
        clubId: stepClub.selectedClubId,
      });

      setIsComplete(true);
      setBookingId(data.bookingId);

      // Notify parent after displaying success message
      setTimeout(() => {
        onSuccess(
          data.bookingId,
          stepCourt.selectedCourt!.id,
          stepDateTime.date,
          stepDateTime.startTime,
          endTime
        );
      }, BOOKING_SUCCESS_DISPLAY_DELAY);
    } catch (err) {
      // Handle specific error messages from the booking store
      const errorMessage = err instanceof Error ? err.message : t("auth.errorOccurred");
      
      // Check for slot already booked error
      if (errorMessage.includes("409") || errorMessage.toLowerCase().includes("already booked")) {
        setSubmitError(t("booking.slotAlreadyBooked"));
      } else {
        setSubmitError(errorMessage);
      }
      setIsSubmitting(false);
    }
  }, [state, t, onSuccess, createBooking]);

  return {
    isSubmitting,
    submitError,
    isComplete,
    bookingId,
    submitBooking,
  };
}
