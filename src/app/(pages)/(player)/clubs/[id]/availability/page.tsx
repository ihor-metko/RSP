"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MobileAvailabilityFlow } from "@/components/mobile-views/MobileAvailabilityFlow";
import { usePlayerClubStore } from "@/stores/usePlayerClubStore";
import { useUserStore } from "@/stores/useUserStore";
import { useIsMobile } from "@/hooks";

export default function AvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();
  const router = useRouter();
  const isMobile = useIsMobile();
  const [clubId, setClubId] = useState<string | null>(null);

  // Use store
  const currentClub = usePlayerClubStore((state) => state.currentClub);
  const loadingClubs = usePlayerClubStore((state) => state.loadingClubs);
  const clubsError = usePlayerClubStore((state) => state.clubsError);
  const ensureClubById = usePlayerClubStore((state) => state.ensureClubById);
  
  const user = useUserStore((state) => state.user);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  useEffect(() => {
    async function loadClub() {
      const resolvedParams = await params;
      setClubId(resolvedParams.id);
      await ensureClubById(resolvedParams.id);
    }
    loadClub();
  }, [params, ensureClubById]);

  // Redirect to club page if not mobile
  useEffect(() => {
    if (!isMobile && clubId) {
      router.push(`/clubs/${clubId}`);
    }
  }, [isMobile, clubId, router]);

  const handleBookingComplete = () => {
    // Navigate to profile or success page after booking
    if (isLoggedIn && user) {
      router.push("/profile");
    } else {
      router.push(`/clubs/${clubId}`);
    }
  };

  const handleBack = () => {
    if (clubId) {
      router.push(`/clubs/${clubId}`);
    } else {
      router.push("/clubs");
    }
  };

  // Loading state
  if (loadingClubs || !currentClub) {
    return (
      <div className="im-mobile-availability-loading">
        <div className="im-mobile-availability-skeleton">
          <div className="im-mobile-availability-skeleton-header" />
          <div className="im-mobile-availability-skeleton-content" />
        </div>
      </div>
    );
  }

  // Error state
  if (clubsError) {
    return (
      <div className="im-mobile-availability-error">
        <p>{clubsError}</p>
        <button onClick={handleBack}>{t("common.back")}</button>
      </div>
    );
  }

  return (
    <MobileAvailabilityFlow
      clubId={currentClub.id}
      clubName={currentClub.name}
      onBack={handleBack}
      onBookingComplete={handleBookingComplete}
    />
  );
}
