"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { PublicFooter } from "@/components/layout";
import { Card, IMLink } from "@/components/ui";
import { PublicSearchBar } from "@/components/PublicSearchBar";
import { PublicClubCard } from "@/components/PublicClubCard";
import { PersonalizedSection } from "@/components/PersonalizedSection";
import { useEffect, useState } from "react";

interface ClubWithCounts {
  id: string;
  name: string;
  location: string;
  contactInfo?: string | null;
  openingHours?: string | null;
  logo?: string | null;
  indoorCount: number;
  outdoorCount: number;
}

export default function Home() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const [popularClubs, setPopularClubs] = useState<ClubWithCounts[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);

  const isAuthenticated = status === "authenticated" && session?.user;

  // Fetch popular clubs for hero section
  useEffect(() => {
    async function fetchPopularClubs() {
      try {
        const response = await fetch("/api/clubs?popular=true&limit=4");
        if (response.ok) {
          const data = await response.json();
          setPopularClubs(data);
        }
      } catch {
        // Silently fail - popular clubs are not critical
      } finally {
        setLoadingClubs(false);
      }
    }
    fetchPopularClubs();
  }, []);

  return (
    <main className="rsp-container min-h-screen">

      {/* Hero section with background and search */}
      <section className="tm-hero relative overflow-hidden bg-linear-to-br from-(--rsp-primary) via-[#0a1040] to-(--rsp-primary)">
        <div className="tm-hero-overlay absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-10" />
        <div className="tm-hero-bg absolute inset-0 bg-[url('/platform/paddle-club-banner.webp')] bg-cover bg-center bg-no-repeat opacity-70" />

        <div className="tm-hero-content relative z-10 max-w-4xl mx-auto px-4 py-16 md:py-24 text-center">
          <h2 className="tm-hero-headline text-3xl md:text-5xl font-bold text-white mb-4">
            {t("home.heroHeadline")}
          </h2>
          <p className="tm-hero-subheadline text-lg md:text-xl text-gray-300 mb-8">
            {t("home.heroSubheadline")}
          </p>

          {/* Search bar in hero */}
          <div className="tm-hero-search max-w-2xl mx-auto bg-white/10 backdrop-blur-xs rounded-lg p-4">
            <PublicSearchBar navigateOnSearch compact />
          </div>
        </div>
      </section>

      {/* Personalized section for authenticated users */}
      {isAuthenticated && session?.user?.name && (
        <PersonalizedSection userName={session.user.name} />
      )}

      {/* Popular clubs section */}
      <section className="im-popular-clubs-section">
        <div className="im-popular-clubs-container">
          <h2 className="im-popular-clubs-title">{t("home.popularClubs")}</h2>

          {loadingClubs ? (
            <div className="im-clubs-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="im-club-card-skeleton" aria-hidden="true">
                  <div className="im-club-card-header">
                    <div className="im-skeleton-logo" />
                    <div className="im-skeleton-text-lg w-32" />
                  </div>
                  <div className="im-club-details space-y-2">
                    <div className="im-skeleton-text w-full" />
                    <div className="im-skeleton-text w-2/3" />
                  </div>
                  <div className="im-skeleton-button" />
                </div>
              ))}
            </div>
          ) : popularClubs.length > 0 ? (
            <div className="im-clubs-grid">
              {popularClubs.map((club) => (
                <PublicClubCard key={club.id} club={club} />
              ))}
            </div>
          ) : (
            <div className="im-clubs-empty">
              <p className="im-clubs-empty-text">{t("clubs.noClubs")}</p>
              <IMLink href="/clubs" className="im-clubs-link mt-2 inline-block">
                {t("home.viewClubs")}
              </IMLink>
            </div>
          )}
        </div>
      </section>

      {/* Why choose us section */}
      <section className="tm-why-choose-us bg-gray-50 dark:bg-gray-900/50 py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">{t("home.whyChooseUs")}</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card title={t("home.feature1Title")}>
              <p className="text-gray-600 dark:text-gray-400">{t("home.feature1Desc")}</p>
            </Card>
            <Card title={t("home.feature2Title")}>
              <p className="text-gray-600 dark:text-gray-400">{t("home.feature2Desc")}</p>
            </Card>
            <Card title={t("home.feature3Title")}>
              <p className="text-gray-600 dark:text-gray-400">{t("home.feature3Desc")}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick links section */}
      <section className="tm-quick-links py-12 px-4 md:px-8">
        <div className="max-w-2xl mx-auto">
          <Card title={t("home.quickLinks")}>
            <div className="rsp-links flex flex-col gap-2">
              {/* Public link - always visible */}
              <IMLink href="/clubs">
                {t("home.viewClubs")}
              </IMLink>

              {/* Player links */}
              {session?.user?.role === "player" && (
                <>
                  <IMLink href="/dashboard">
                    {t("home.dashboard")}
                  </IMLink>
                  <IMLink href="/trainings">
                    {t("training.history.title")}
                  </IMLink>
                </>
              )}

              {/* Coach links */}
              {session?.user?.role === "coach" && (
                <IMLink href="/coach/dashboard">
                  {t("home.dashboard")}
                </IMLink>
              )}

              {/* Admin links */}
              {session?.user?.role === "admin" && (
                <>
                  <IMLink href="/admin/clubs">
                    {t("home.manageClubs")}
                  </IMLink>
                  <IMLink href="/admin/coaches">
                    {t("home.manageCoaches")}
                  </IMLink>
                  <IMLink href="/admin/notifications">
                    {t("home.manageNotifications")}
                  </IMLink>
                </>
              )}

              {/* Auth links for unauthenticated users */}
              {!isAuthenticated && (
                <>
                  <IMLink href="/auth/sign-in">
                    {t("common.signIn")}
                  </IMLink>
                  <IMLink href="/auth/sign-up">
                    {t("common.register")}
                  </IMLink>
                </>
              )}
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </main>
  );
}
