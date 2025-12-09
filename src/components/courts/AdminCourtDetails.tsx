"use client";

import { useTranslations } from "next-intl";
import { Button, IMLink, Card } from "@/components/ui";

interface AdminCourtDetailsProps {
  courtId: string;
  clubId: string;
  clubName: string;
  orgName?: string;
  isActive?: boolean;
  onEdit?: (courtId: string) => void;
  onDelete?: (courtId: string) => void;
  showOrganization?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

export function AdminCourtDetails({
  courtId,
  clubId,
  clubName,
  orgName,
  isActive = true,
  onEdit,
  onDelete,
  showOrganization = true,
  canEdit = true,
  canDelete = false,
}: AdminCourtDetailsProps) {
  const t = useTranslations();

  return (
    <Card className="mt-3 p-4">
      {/* Organization Info */}
      {showOrganization && orgName && (
        <div className="mb-2 text-sm">
          <span className="font-medium" style={{ color: "var(--im-muted)" }}>
            {t("sidebar.organizations")}:{" "}
          </span>
          <span>{orgName}</span>
        </div>
      )}

      {/* Club Info */}
      <div className="mb-2 text-sm">
        <span className="font-medium" style={{ color: "var(--im-muted)" }}>
          {t("admin.courts.clubLabel")}:{" "}
        </span>
        <IMLink href={`/admin/clubs/${clubId}`}>
          {clubName}
        </IMLink>
      </div>

      {/* Court Status */}
      <div className="mb-3 text-sm">
        <span className="font-medium" style={{ color: "var(--im-muted)" }}>
          {t("admin.courts.status")}:{" "}
        </span>
        <span className={isActive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
          {isActive ? t("admin.courts.active") : t("admin.courts.inactive")}
        </span>
      </div>

      {/* Admin Actions */}
      <div className="flex flex-wrap gap-2">
        <IMLink
          href={`/admin/clubs/${clubId}/courts/${courtId}/price-rules`}
          className="flex-1"
        >
          <Button variant="outline" className="w-full">
            {t("admin.courts.pricing")}
          </Button>
        </IMLink>
      </div>

      {(canEdit || canDelete) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {canEdit && onEdit && (
            <Button
              variant="outline"
              onClick={() => onEdit(courtId)}
              className="flex-1"
            >
              {t("common.edit")}
            </Button>
          )}
          {canDelete && onDelete && (
            <Button
              variant="outline"
              onClick={() => onDelete(courtId)}
              className="text-red-500 hover:text-red-700 flex-1"
            >
              {t("common.delete")}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
