"use client";

import { CourtCard } from "./CourtCard";
import { AdminCourtDetails } from "./AdminCourtDetails";
import type { Court } from "@/types/court";

interface AdminCourtCardProps {
  court: Court;
  clubId: string;
  clubName: string;
  orgName?: string;
  isActive?: boolean;
  onViewDetails?: (courtId: string) => void;
  onEdit?: (courtId: string) => void;
  onDelete?: (courtId: string) => void;
  showOrganization?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

/**
 * AdminCourtCard - Wrapper component for admin pages
 * Combines the client-facing CourtCard with admin-only details
 */
export function AdminCourtCard({
  court,
  clubId,
  clubName,
  orgName,
  isActive = true,
  onViewDetails,
  onEdit,
  onDelete,
  showOrganization = true,
  canEdit = true,
  canDelete = false,
}: AdminCourtCardProps) {
  return (
    <div className="flex flex-col">
      <CourtCard
        court={court}
        showBookButton={false}
        showViewSchedule={false}
        showViewDetails={!!onViewDetails}
        onViewDetails={onViewDetails}
        showLegend={false}
        showAvailabilitySummary={false}
        showDetailedAvailability={false}
      />
      
      <AdminCourtDetails
        courtId={court.id}
        clubId={clubId}
        clubName={clubName}
        orgName={orgName}
        isActive={isActive}
        onEdit={onEdit}
        onDelete={onDelete}
        showOrganization={showOrganization}
        canEdit={canEdit}
        canDelete={canDelete}
      />
    </div>
  );
}
