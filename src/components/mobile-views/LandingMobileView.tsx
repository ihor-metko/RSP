"use client";

import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { useEffect, useState } from "react";
import { Button, IMLink } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { formatDateTime } from "@/utils/date";
import "./MobileViews.css";

/**
 * LandingMobileView
 *
 * Mobile-first landing page for player flow.
 * Shows hero section with primary CTA to find courts.
 * Conditional secondary CTA based on auth state:
 * - Not logged in: Sign In / Sign Up
 * - Logged in: My Bookings
 * Optional next booking section for logged-in users.
 */
export function LandingMobileView() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isHydrated = useUserStore((state) => state.isHydrated);
  const [nextBooking, setNextBooking] = useState<{
    clubName: string;
    dateTime: string;
    bookingId: string;
  } | null>(null);

  // Fetch next booking for logged-in users
  useEffect(() => {
    if (!isLoggedIn || !isHydrated) {
      setNextBooking(null);
      return;
    }

    // Fetch next upcoming booking
    const fetchNextBooking = async () => {
      try {
        const response = await fetch("/api/bookings?upcoming=true&take=1");
        
        if (!response.ok) {
          console.error("Failed to fetch next booking:", response.status);
          return;
        }
        
        const bookings = await response.json();
        if (bookings.length > 0) {
          const booking = bookings[0];
          setNextBooking({
            clubName: booking.court?.club?.name || t("landing.unknownClub"),
            dateTime: formatDateTime(booking.start, locale),
            bookingId: booking.id,
          });
        }
      } catch (error) {
        console.error("Failed to fetch next booking:", error);
      }
    };

    fetchNextBooking();
  }, [isLoggedIn, isHydrated, locale, t]);

  return (
    <div className="im-mobile-landing">
      {/* Hero Section */}
      <div className="im-mobile-landing-hero">
        <div className="im-mobile-landing-logo">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="im-mobile-landing-logo-icon"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
        </div>
        <h1 className="im-mobile-landing-title">{t("landing.title")}</h1>
        <p className="im-mobile-landing-tagline">{t("landing.tagline")}</p>
      </div>

      {/* Primary CTA - Always visible, above the fold */}
      <div className="im-mobile-landing-actions">
        <Button
          onClick={() => router.push("/clubs")}
          className="im-mobile-landing-primary-cta"
          aria-label={t("landing.findCourt")}
        >
          {t("landing.findCourt")}
        </Button>

        {/* Secondary CTA - Conditional based on auth state */}
        {isHydrated && (
          <>
            {!isLoggedIn ? (
              <div className="im-mobile-landing-secondary-actions">
                <IMLink href="/auth/sign-in" className="im-mobile-landing-link">
                  {t("auth.signIn")}
                </IMLink>
                <span className="im-mobile-landing-separator">/</span>
                <IMLink href="/auth/sign-up" className="im-mobile-landing-link">
                  {t("auth.signUp")}
                </IMLink>
              </div>
            ) : (
              <div className="im-mobile-landing-secondary-actions">
                <IMLink href="/profile" className="im-mobile-landing-link">
                  {t("landing.myBookings")}
                </IMLink>
              </div>
            )}
          </>
        )}
      </div>

      {/* Optional Next Booking Section - Only for logged-in users */}
      {isHydrated && isLoggedIn && nextBooking && (
        <div className="im-mobile-landing-next-booking">
          <div className="im-mobile-landing-next-booking-title">
            {t("landing.nextBooking")}
          </div>
          <div className="im-mobile-landing-next-booking-info">
            <div className="im-mobile-landing-next-booking-club">
              {nextBooking.clubName}
            </div>
            <div className="im-mobile-landing-next-booking-datetime">
              {nextBooking.dateTime}
            </div>
          </div>
          <Button
            onClick={() => router.push(`/profile`)}
            variant="outline"
            className="im-mobile-landing-next-booking-btn"
            aria-label={t("landing.viewBooking")}
          >
            {t("landing.viewBooking")}
          </Button>
        </div>
      )}
    </div>
  );
}
