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
 * @deprecated Use the unified CourtCard component directly instead.
 * 
 * AdminCourtCard - Wrapper component for admin pages (DEPRECATED)
 * 
 * This component is deprecated. Use the unified CourtCard component directly
 * with club and organization props for admin contexts.
 * 
 * @example Migration
 * ```tsx
 * // Before (deprecated):
 * <AdminCourtCard
 *   court={courtData}
 *   clubId="club-123"
 *   clubName="Tennis Club"
 *   orgName="Sports Organization"
 *   isActive={true}
 *   onEdit={(id) => handleEdit(id)}
 * />
 * 
 * // After (recommended):
 * <CourtCard
 *   court={courtData}
 *   club={{ id: "club-123", name: "Tennis Club", ...clubData }}
 *   organization={{ id: "org-123", name: "Sports Organization", ...orgData }}
 *   isActive={true}
 *   onEdit={(id) => handleEdit(id)}
 *   showBookButton={false}
 *   showViewSchedule={false}
 * />
 * ```
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
