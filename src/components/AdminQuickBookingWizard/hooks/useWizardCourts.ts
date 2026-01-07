/**
 * Custom hook for managing court data fetching and pricing in the wizard
 */
import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { clubLocalToUTCTime } from "@/utils/dateTime";
import { getClubTimezone } from "@/constants/timezone";
import type { WizardCourt, WizardStepDateTime } from "../types";

const MINUTES_PER_HOUR = 60;

interface UseWizardCourtsOptions {
  clubId: string | null;
  clubTimezone: string | null | undefined;
  dateTime: WizardStepDateTime;
}

interface UseWizardCourtsReturn {
  courts: WizardCourt[];
  isLoading: boolean;
  error: string | null;
  fetchCourts: () => Promise<void>;
}

/**
 * Hook for fetching available courts and their pricing
 * Fetches courts based on club, date, time, and duration
 * Also fetches price timeline for each court
 */
export function useWizardCourts({
  clubId,
  clubTimezone,
  dateTime,
}: UseWizardCourtsOptions): UseWizardCourtsReturn {
  const t = useTranslations();
  const [courts, setCourts] = useState<WizardCourt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCourts = useCallback(async () => {
    if (!clubId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { date, startTime, duration } = dateTime;
      
      // Get club timezone (with fallback to default)
      const timezone = getClubTimezone(clubTimezone);
      
      // Convert club local time to UTC time string (HH:MM format) for API
      const utcTimeString = clubLocalToUTCTime(date, startTime, timezone);
      
      const params = new URLSearchParams({
        date,
        start: utcTimeString, // Send UTC time
        duration: duration.toString(),
      });

      const response = await fetch(
        `/api/clubs/${clubId}/available-courts?${params}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.error || t("auth.errorOccurred"));
        return;
      }

      const data = await response.json();
      const availableCourts: WizardCourt[] = data.availableCourts || [];

      // Fetch price timeline for each court
      const courtsWithPrices = await Promise.all(
        availableCourts.map(async (court) => {
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
            // Ignore price fetch errors, use default price
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

      setCourts(courtsWithPrices);
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }, [clubId, clubTimezone, dateTime, t]);

  return {
    courts,
    isLoading,
    error,
    fetchCourts,
  };
}
