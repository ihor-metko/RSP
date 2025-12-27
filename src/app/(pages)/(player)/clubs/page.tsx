"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { IMLink, PageHeader } from "@/components/ui";
import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { PublicClubCard } from "@/components/PublicClubCard";
import { PublicSearchBar, SearchParams } from "@/components/PublicSearchBar";
import { useDeferredLoading } from "@/hooks";
import "@/components/ClubsList.css";

/**
 * Player Clubs Page
 * 
 * Note: This page uses direct API calls instead of useClubStore because it requires
 * server-side filtering with query parameters (search, city, indoor filter) that are
 * not supported by the basic store implementation. Public-facing pages with complex
 * filtering should continue using direct API calls for optimal performance.
 */

interface ClubWithCounts {
  id: string;
  name: string;
  shortDescription?: string | null;
  location: string;
  city?: string | null;
  contactInfo?: string | null;
  openingHours?: string | null;
  logoData?: { url: string; altText?: string; thumbnailUrl?: string } | null;
  bannerData?: { url: string; altText?: string; description?: string; position?: string } | null;
  metadata?: string | null;
  tags?: string | null;
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

  // Use deferred loading to prevent flicker on fast responses
  const deferredLoading = useDeferredLoading(loading);

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

  const isInitialLoading = deferredLoading && clubs.length === 0;

  if (error && clubs.length === 0) {
    return (
      <main className="tm-clubs-page">
        <div className="tm-access-denied">
          <h1 className="tm-access-denied-title">{t("common.error")}</h1>
          <p className="tm-access-denied-text">{error}</p>
          <IMLink href="/" className="tm-clubs-link">
            {t("common.backToHome")}
          </IMLink>
        </div>
      </main>
    );
  }

  return (
    <main className="tm-clubs-page">
      {isInitialLoading ? (
        <PageHeaderSkeleton showDescription />
      ) : (
        <PageHeader
          title={t("clubs.title")}
          description={t("clubs.subtitle")}
        />
      )}

      {/* Search bar with URL-driven values */}
      {!isInitialLoading && (
        <PublicSearchBar
          initialQ={currentParams.q}
          initialCity={currentParams.city}
          initialIndoor={currentParams.indoor}
          onSearch={handleSearch}
        />
      )}

      {isInitialLoading || loading ? (
        <CardListSkeleton count={6} variant="default" />
      ) : clubs.length === 0 ? (
        <div className="tm-clubs-empty">
          <p className="tm-clubs-empty-text">
            {getEmptyStateMessage(currentParams.q, currentParams.city, currentParams.indoor ?? false, t)}
          </p>
          {(currentParams.q || currentParams.city || currentParams.indoor) && (
            <p className="tm-clubs-empty-suggestion text-gray-400 text-sm mt-2">
              {t("clubs.trySuggestion")}
            </p>
          )}
        </div>
      ) : (
        <section className="tm-clubs-grid">
          {clubs.map((club) => (
            <PublicClubCard key={club.id} club={club} />
          ))}
        </section>
      )}
    </main>
  );
}
