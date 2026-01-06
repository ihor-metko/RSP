"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AdminClubCard } from "@/components/admin/AdminClubCard";
import { CardListSkeleton } from "@/components/ui/skeletons";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useUserStore } from "@/stores/useUserStore";
import "./OperationsClubCardSelector.css";

interface OperationsClubCardSelectorProps {
  /** Currently selected club ID */
  value: string;
  /** Callback when club selection changes */
  onChange: (clubId: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Club card selector component for the Operations page.
 * Displays clubs as clickable cards similar to the Admin Clubs page.
 * 
 * Features:
 * - Displays clubs as cards using AdminClubCard component
 * - Automatically fetches clubs from store
 * - Filters clubs based on user role (Root Admin, Org Admin, Club Admin)
 * - Cards are clickable to select a club
 * - Selected club is visually highlighted
 * - Responsive grid layout
 * - Keyboard-navigable and screen-reader friendly
 */
export function OperationsClubCardSelector({
  value,
  onChange,
  className = "",
}: OperationsClubCardSelectorProps) {
  const t = useTranslations();
  
  // Get clubs from store
  const clubs = useAdminClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);
  const loading = useAdminClubStore((state) => state.loadingClubs);

  // Get user info for filtering
  const adminStatus = useUserStore((state) => state.adminStatus);
  const user = useUserStore((state) => state.user);

  const [hasInitialized, setHasInitialized] = useState(false);

  // Fetch clubs on mount
  useEffect(() => {
    if (!hasInitialized) {
      fetchClubsIfNeeded().catch((error) => {
        console.error("Failed to fetch clubs:", error);
      });
      setHasInitialized(true);
    }
  }, [hasInitialized, fetchClubsIfNeeded]);

  // Filter clubs based on user role
  const filteredClubs = useMemo(() => {
    // Root admins see all clubs
    if (user?.isRoot) {
      return clubs;
    }

    // Organization admins see only clubs in their managed organizations
    if (adminStatus?.adminType === "organization_admin") {
      const managedOrgIds = new Set(adminStatus.managedIds);
      return clubs.filter((club) => managedOrgIds.has(club.organizationId));
    }

    // Club owners/admins should only see their assigned club(s)
    if (adminStatus?.adminType === "club_admin" || adminStatus?.adminType === "club_owner") {
      const managedClubIds = new Set(adminStatus.managedIds);
      return clubs.filter((club) => managedClubIds.has(club.id));
    }

    // Default: no clubs (user is not an admin)
    return [];
  }, [clubs, adminStatus, user]);

  // Handle card click
  const handleCardClick = (clubId: string) => {
    onChange(clubId);
  };

  // Handle keyboard navigation
  const handleCardKeyDown = (e: React.KeyboardEvent, clubId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onChange(clubId);
    }
  };

  // Determine if Root Admin to show organization info
  const showOrganization = user?.isRoot;

  if (loading && clubs.length === 0) {
    return (
      <div className={`im-operations-club-selector ${className}`}>
        <CardListSkeleton count={6} variant="default" />
      </div>
    );
  }

  if (filteredClubs.length === 0) {
    return (
      <div className={`im-operations-club-selector ${className}`}>
        <div className="im-operations-club-selector-empty">
          <p>{t("operations.noClubsAvailable")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`im-operations-club-selector ${className}`}>
      <div className="im-operations-club-cards-grid">
        {filteredClubs.map((club) => {
          const isSelected = value === club.id;
          return (
            <div
              key={club.id}
              className={`im-operations-club-card-wrapper ${isSelected ? "im-operations-club-card-selected" : ""}`}
              onClick={() => handleCardClick(club.id)}
              onKeyDown={(e) => handleCardKeyDown(e, club.id)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${t("operations.selectClub")}: ${club.name}${isSelected ? ` (${t("common.selected")})` : ""}`}
            >
              <AdminClubCard 
                club={club} 
                showOrganization={showOrganization}
                actionButton={{
                  label: t("operations.selectClub"),
                  onClick: (e) => {
                    e?.stopPropagation();
                    handleCardClick(club.id);
                  }
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
