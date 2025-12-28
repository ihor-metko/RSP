"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Badge, Tooltip } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { UserProfileModal } from "./UserProfileModal";
import { CreateAdminModal } from "./admin-wizard";
import "./OrganizationAdminsTable.css";

interface OrgAdmin {
  id: string;
  type: "superadmin";
  userId: string;
  userName: string | null;
  userEmail: string;
  isPrimaryOwner: boolean;
  lastLoginAt: Date | string | null;
  createdAt: Date;
}

interface OrganizationAdminsTableProps {
  orgId: string;
  admins: OrgAdmin[];
  onRefresh: () => void;
}

export default function OrganizationAdminsTable({
  orgId,
  admins,
  onRefresh,
}: OrganizationAdminsTableProps) {
  const t = useTranslations();
  const user = useUserStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;
  const removeAdmin = useOrganizationStore((state) => state.removeAdmin);

  // Get organization detail from store to pass to modal (avoids fetching)
  const getOrganizationDetailById = useOrganizationStore((state) => state.getOrganizationDetailById);
  const org = getOrganizationDetailById(orgId);

  // Create Admin modal state
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Remove admin modal state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<OrgAdmin | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);

  // View profile modal state
  const [isViewProfileModalOpen, setIsViewProfileModalOpen] = useState(false);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Handle create admin modal
  const handleOpenCreateAdminModal = () => {
    setIsCreateAdminModalOpen(true);
  };

  const handleCloseCreateAdminModal = () => {
    setIsCreateAdminModalOpen(false);
  };

  // Handle remove admin
  const handleOpenRemoveModal = (admin: OrgAdmin) => {
    setAdminToRemove(admin);
    setRemoveError("");
    setIsRemoveModalOpen(true);
  };

  const handleRemoveAdmin = async () => {
    if (!adminToRemove) return;

    setRemoveError("");
    setRemoving(true);

    try {
      await removeAdmin({
        organizationId: orgId,
        userId: adminToRemove.userId,
      });

      showToast(t("orgAdmins.adminRemoved"), "success");
      setIsRemoveModalOpen(false);
      setAdminToRemove(null);
      onRefresh();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setRemoving(false);
    }
  };

  // Root Admin or Organization Owner (isPrimaryOwner) can manage org admins
  const primaryOwner = admins.find((a) => a.isPrimaryOwner);
  const isOwner = primaryOwner?.userId === user?.id;
  const canManageAdmins = isRoot || isOwner;

  // Check if an owner already exists to determine allowed roles
  const hasOwner = !!primaryOwner;
  const allowedRoles: import("@/types/adminWizard").AdminRole[] = hasOwner
    ? ["ORGANIZATION_ADMIN"]
    : ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"];

  // Sort admins: Owner first, then Organization Admins
  const sortedAdmins = [...admins].sort((a, b) => {
    if (a.isPrimaryOwner) return -1;
    if (b.isPrimaryOwner) return 1;
    return 0;
  });

  // Check if user can modify a specific admin
  const canModifyAdmin = (admin: OrgAdmin) => {
    // Root Admin can modify anyone
    if (isRoot) return true;

    // Owner cannot be modified by non-root users (including by owner themselves in some cases)
    if (admin.isPrimaryOwner) {
      // Owner can only remove themselves if they want to transfer ownership first
      return false;
    }

    // Organization Owner can modify other admins
    if (isOwner) return true;

    return false;
  };

  // Handle view profile
  const handleViewProfile = (userId: string) => {
    setSelectedAdminUserId(userId);
    setIsViewProfileModalOpen(true);
  };

  // Get initials for avatar
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      const parts = name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <div className="im-org-admins-section">
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
      )}

      <div className="im-section-header">
        <div className="im-section-icon im-section-icon--admins">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="im-section-title">{t("orgAdmins.administratorsAndOwners")}</h3>
        <div className="im-section-actions">
          {canManageAdmins && (
            <Button onClick={handleOpenCreateAdminModal}>
              {isRoot ? t("orgAdmins.addAdminOrOwner") : t("orgAdmins.addAdmin")}
            </Button>
          )}
        </div>
      </div>

      {admins.length === 0 ? (
        <p className="im-empty-state">{t("orgAdmins.noPeople")}</p>
      ) : (
        <div className="im-admins-list">
          {sortedAdmins.map((admin) => {
            const canModify = canModifyAdmin(admin);
            const tooltipMessage = !canModify && admin.isPrimaryOwner
              ? t("orgAdmins.ownerProtectionTooltip")
              : "";
            const isCurrentUserOwner = admin.isPrimaryOwner && admin.userId === user?.id;

            return (
              <div key={admin.id} className="im-admin-row">
                <div className="im-admin-avatar">
                  {getInitials(admin.userName, admin.userEmail)}
                </div>
                <div className="im-admin-info">
                  <div className="im-admin-name-row">
                    <span className="im-admin-name">
                      {admin.userName || admin.userEmail}
                      {isCurrentUserOwner && (
                        <span className="im-admin-you-indicator"> ({t("orgAdmins.you")})</span>
                      )}
                    </span>
                    {admin.isPrimaryOwner ? (
                      <Badge variant="success" size="small">
                        {t("orgAdmins.owner")}
                      </Badge>
                    ) : (
                      <Badge variant="info" size="small">
                        {t("orgAdmins.orgAdmin")}
                      </Badge>
                    )}
                  </div>
                  <span className="im-admin-email">{admin.userEmail}</span>
                  {isRoot && (
                    <span className="im-admin-meta">
                      {t("orgAdmins.lastLogin")}:{" "}
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString()
                        : t("common.never")}
                    </span>
                  )}
                </div>
                <div className="im-admin-actions">
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => handleViewProfile(admin.userId)}
                  >
                    {t("common.viewProfile")}
                  </Button>
                  {canModify ?? (
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleOpenRemoveModal(admin)}
                    >
                      {t("common.remove")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Admin Modal */}
      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={handleCloseCreateAdminModal}
        config={{
          context: "organization",
          defaultOrgId: orgId,
          organizationData: org ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
          } : undefined,
          allowedRoles: allowedRoles,
          onSuccess: () => {
            // Refresh the admins list after successful creation
            onRefresh();
          },
        }}
      />

      {/* Remove Admin Modal */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title={t("orgAdmins.removeAdmin")}
      >
        <div className="space-y-4">
          {removeError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {removeError}
            </div>
          )}

          <p>
            {t("orgAdmins.removeConfirm", {
              name: adminToRemove?.userName || adminToRemove?.userEmail || "",
            })}
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRemoveModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={handleRemoveAdmin} disabled={removing}>
              {removing ? t("common.processing") : t("common.remove")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Profile Modal */}
      {selectedAdminUserId && (
        <UserProfileModal
          isOpen={isViewProfileModalOpen}
          onClose={() => {
            setIsViewProfileModalOpen(false);
            setSelectedAdminUserId(null);
          }}
          userId={selectedAdminUserId}
        />
      )}
    </div>
  );
}
