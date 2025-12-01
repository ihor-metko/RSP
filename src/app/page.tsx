"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button, Card, DarkModeToggle, LanguageSwitcher } from "@/components/ui";
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

          {/* Hero CTA buttons */}
          <div className="tm-hero-cta flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {!isAuthenticated && (
              <Link href="/auth/sign-up">
                <Button className="w-full sm:w-auto">{t("common.register")}</Button>
              </Link>
            )}
            <Link href="/clubs">
              <Button variant="outline" className="w-full sm:w-auto tm-hero-view-clubs">
                {t("home.viewClubs")}
              </Button>
            </Link>
          </div>

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
              <Link href="/clubs" className="text-blue-500 hover:underline mt-2 inline-block">
                {t("home.viewClubs")}
              </Link>
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
              <Link href="/clubs" className="rsp-link text-blue-500 hover:underline">
                {t("home.viewClubs")}
              </Link>

              {/* Player links */}
              {session?.user?.role === "player" && (
                <>
                  <Link href="/dashboard" className="rsp-link text-blue-500 hover:underline">
                    {t("home.dashboard")}
                  </Link>
                  <Link href="/trainings" className="rsp-link text-blue-500 hover:underline">
                    {t("training.history.title")}
                  </Link>
                </>
              )}

              {/* Coach links */}
              {session?.user?.role === "coach" && (
                <Link href="/coach/dashboard" className="rsp-link text-blue-500 hover:underline">
                  {t("home.dashboard")}
                </Link>
              )}

              {/* Admin links */}
              {session?.user?.role === "admin" && (
                <>
                  <Link href="/admin/clubs" className="rsp-link text-blue-500 hover:underline">
                    {t("home.manageClubs")}
                  </Link>
                  <Link href="/admin/coaches" className="rsp-link text-blue-500 hover:underline">
                    {t("home.manageCoaches")}
                  </Link>
                  <Link href="/admin/notifications" className="rsp-link text-blue-500 hover:underline">
                    {t("home.manageNotifications")}
                  </Link>
                </>
              )}

              {/* Auth links for unauthenticated users */}
              {!isAuthenticated && (
                <>
                  <Link href="/auth/sign-in" className="rsp-link text-blue-500 hover:underline">
                    {t("common.signIn")}
                  </Link>
                  <Link href="/auth/sign-up" className="rsp-link text-blue-500 hover:underline">
                    {t("common.register")}
                  </Link>
                </>
              )}
            </div>
          </Card>
        </div>
      </section>
    </main>
  );
}
