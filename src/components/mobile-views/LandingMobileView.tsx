"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, IMLink } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import "./MobileViews.css";

/**
 * LandingMobileView
 * 
 * Mobile-first landing page skeleton for player flow.
 * Shows hero section with primary CTA to find courts and secondary CTA for auth.
 * Auto-redirects logged-in users to /clubs.
 */
export function LandingMobileView() {
  const t = useTranslations();
  const router = useRouter();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  // Auto-redirect logged-in users to clubs page
  useEffect(() => {
    if (isLoggedIn) {
      router.push("/clubs");
    }
  }, [isLoggedIn, router]);

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

      {/* Primary CTA */}
      <div className="im-mobile-landing-actions">
        <Button
          onClick={() => router.push("/clubs")}
          className="im-mobile-landing-primary-cta"
          aria-label={t("landing.findCourt")}
        >
          {t("landing.findCourt")}
        </Button>

        {/* Secondary CTA */}
        <div className="im-mobile-landing-secondary-actions">
          <IMLink href="/auth/signin" className="im-mobile-landing-link">
            {t("auth.signIn")}
          </IMLink>
          <span className="im-mobile-landing-separator">/</span>
          <IMLink href="/auth/signup" className="im-mobile-landing-link">
            {t("auth.signUp")}
          </IMLink>
        </div>
      </div>
    </div>
  );
}
