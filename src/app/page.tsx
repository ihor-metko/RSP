"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button, Card, DarkModeToggle, LanguageSwitcher, IMLink } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { PublicSearchBar } from "@/components/PublicSearchBar";
import { PublicClubCard } from "@/components/PublicClubCard";
import { PersonalizedSection } from "@/components/PersonalizedSection";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
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
  const currentLocale = useCurrentLocale();
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
      {/* Header with navigation */}
      <header className="rsp-header flex items-center justify-between p-4 md:p-8">
        <h1 className="rsp-title text-xl md:text-2xl font-bold">{t("home.title")}</h1>
        <div className="flex items-center gap-2 md:gap-4">
          <UserRoleIndicator />
          <LanguageSwitcher currentLocale={currentLocale} />
          <DarkModeToggle />
        </div>
      </header>

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
      <section className="tm-popular-clubs py-12 px-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t("home.popularClubs")}</h2>

          {loadingClubs ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="tm-club-card animate-pulse">
                  <div className="tm-club-card-header">
                    <div className="tm-club-logo-placeholder bg-gray-200 dark:bg-gray-700" />
                    <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                  </div>
                  <div className="tm-club-details space-y-2">
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-sm" />
                    <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                  </div>
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-sm mt-4" />
                </div>
              ))}
            </div>
          ) : popularClubs.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {popularClubs.map((club) => (
                <PublicClubCard key={club.id} club={club} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>{t("clubs.noClubs")}</p>
              <IMLink href="/clubs" className="mt-2 inline-block">
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
    </main>
  );
}
