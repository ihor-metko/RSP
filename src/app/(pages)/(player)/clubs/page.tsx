"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";
import { PublicClubCard } from "@/components/PublicClubCard";
import { PublicSearchBar, SearchParams } from "@/components/PublicSearchBar";
import { PublicFooter } from "@/components/layout";
import "@/components/ClubsList.css";

interface ClubWithCounts {
  id: string;
  name: string;
  location: string;
  contactInfo?: string | null;
  openingHours?: string | null;
  logo?: string | null;
  createdAt: string;
  indoorCount: number;
  outdoorCount: number;
}

// Helper function to determine empty state message
function getEmptyStateMessage(
  q: string,
  city: string,
  indoor: boolean,
  t: ReturnType<typeof useTranslations>
): string {
  const hasFilters = q || city || indoor;
  return hasFilters ? t("clubs.noClubsFound") : t("clubs.noClubs");
}

export default function ClubsPage() {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read initial values from URL
  const urlQ = searchParams.get("q") || "";
  const urlCity = searchParams.get("city") || "";
  const urlIndoor = searchParams.get("indoor") === "true";
  
  const [clubs, setClubs] = useState<ClubWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentParams, setCurrentParams] = useState<SearchParams>({
    q: urlQ,
    city: urlCity,
    indoor: urlIndoor,
  });

  // Update URL when search params change
  const updateUrl = useCallback((params: SearchParams) => {
    const urlParams = new URLSearchParams();
    if (params.q) urlParams.set("q", params.q);
    if (params.city) urlParams.set("city", params.city);
    if (params.indoor) urlParams.set("indoor", "true");
    const queryString = urlParams.toString();
    router.replace(`/clubs${queryString ? `?${queryString}` : ""}`, { scroll: false });
  }, [router]);

  const fetchClubs = useCallback(async (params: SearchParams) => {
    try {
      setLoading(true);
      const urlParams = new URLSearchParams();
      if (params.q) urlParams.set("q", params.q);
      if (params.city) urlParams.set("city", params.city);
      if (params.indoor) urlParams.set("indoor", "true");
      
      const url = `/api/clubs${urlParams.toString() ? `?${urlParams.toString()}` : ""}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error("Failed to fetch clubs");
      }
      const data = await response.json();
      setClubs(data);
      setError("");
    } catch {
      setError(t("clubs.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Sync with URL changes (back/forward navigation)
  useEffect(() => {
    const params = { q: urlQ, city: urlCity, indoor: urlIndoor };
    setCurrentParams(params);
    fetchClubs(params);
  }, [urlQ, urlCity, urlIndoor, fetchClubs]);

  // Handle search from PublicSearchBar
  const handleSearch = useCallback((params: SearchParams) => {
    setCurrentParams(params);
    updateUrl(params);
    fetchClubs(params);
  }, [updateUrl, fetchClubs]);

  // Determine if user is authenticated
  const isAuthenticated = status === "authenticated" && session?.user;

  if (loading && clubs.length === 0) {
    return (
      <main className="im-clubs-page">
        <div className="im-clubs-loading">
          <div className="im-clubs-loading-spinner" />
          <span className="im-clubs-loading-text">{t("clubs.loadingClubs")}</span>
        </div>
      </main>
    );
  }

  if (error && clubs.length === 0) {
    return (
      <main className="im-clubs-page">
        <div className="im-access-denied">
          <h1 className="im-access-denied-title">{t("common.error")}</h1>
          <p className="im-access-denied-text">{error}</p>
          <IMLink href="/" className="im-clubs-link">
            {t("common.backToHome")}
          </IMLink>
        </div>
      </main>
    );
  }

  return (
    <main className="im-clubs-page">
      <header className="im-clubs-header">
        <h1 className="im-clubs-title">{t("clubs.title")}</h1>
        <p className="im-clubs-subtitle">{t("clubs.subtitle")}</p>
      </header>

      {/* Sign in prompt for unauthenticated users */}
      {!isAuthenticated && (
        <div className="im-auth-cta mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            <IMLink href="/auth/sign-in" className="font-semibold underline hover:no-underline">
              {t("auth.signInToBook")}
            </IMLink>
          </p>
        </div>
      )}

      {/* Search bar with URL-driven values */}
      <PublicSearchBar
        initialQ={currentParams.q}
        initialCity={currentParams.city}
        initialIndoor={currentParams.indoor}
        onSearch={handleSearch}
      />

      {loading ? (
        <div className="im-clubs-grid">
          {[1, 2, 3].map((i) => (
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
      ) : clubs.length === 0 ? (
        <div className="im-clubs-empty">
          <p className="im-clubs-empty-text">
            {getEmptyStateMessage(currentParams.q, currentParams.city, currentParams.indoor ?? false, t)}
          </p>
          {(currentParams.q || currentParams.city || currentParams.indoor) && (
            <p className="im-clubs-empty-suggestion text-sm mt-2" style={{ opacity: 0.6 }}>
              {t("clubs.trySuggestion")}
            </p>
          )}
        </div>
      ) : (
        <section className="im-clubs-grid">
          {clubs.map((club) => (
            <PublicClubCard key={club.id} club={club} />
          ))}
        </section>
      )}

      <div className="im-clubs-navigation">
        <IMLink href="/" className="im-clubs-link">
          {t("common.backToHome")}
        </IMLink>
      </div>

      {/* Footer */}
      <PublicFooter />
    </main>
  );
}
