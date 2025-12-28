"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Badge, Tooltip, TableSkeleton } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminsStore } from "@/stores/useAdminsStore";
import { UserProfileModal } from "./UserProfileModal";
import { CreateAdminModal } from "./admin-wizard";
import type { UnifiedAdmin, ContainerType } from "@/types/unifiedAdmin";
import "./OrganizationAdminsTable.css";

interface UnifiedAdminsTableProps {
  containerType: ContainerType;
  containerId: string;
  containerName?: string;
  /**
   * Optional organization data - used when container is organization
   * to avoid additional fetches in CreateAdminModal
   */
  organizationData?: {
    id: string;
    name: string;
    slug: string;
  };
  /**
   * Optional club data - used when container is club
   * to avoid additional fetches in CreateAdminModal
   */
  clubData?: {
    id: string;
    name: string;
    organizationId: string;
  };
}

export default function UnifiedAdminsTable({
  containerType,
  containerId,
  containerName,
  organizationData,
  clubData,
}: UnifiedAdminsTableProps) {
  const t = useTranslations();
  const user = useUserStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;

  // Admin store
  const fetchAdminsIfNeeded = useAdminsStore((state) => state.fetchAdminsIfNeeded);
  const admins = useAdminsStore((state) => state.getAdmins(containerType, containerId));
  const isLoadingAdmins = useAdminsStore((state) => state.isLoading(containerType, containerId));
  const removeAdmin = useAdminsStore((state) => state.removeAdmin);
  const changeAdminRole = useAdminsStore((state) => state.changeAdminRole);

  // Local state
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<UnifiedAdmin | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);
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

  // Fetch admins on mount
  useEffect(() => {
    fetchAdminsIfNeeded(containerType, containerId).catch((error) => {
      console.error("Failed to fetch admins:", error);
      showToast(t("errors.failedToLoadAdmins"), "error");
    });
  }, [containerType, containerId, fetchAdminsIfNeeded, t]);

  // Handle create admin modal
  const handleOpenCreateAdminModal = () => {
    setIsCreateAdminModalOpen(true);
  };

  const handleCloseCreateAdminModal = () => {
    setIsCreateAdminModalOpen(false);
  };

  // Refresh admins after successful creation
  const handleAdminCreated = async () => {
    await fetchAdminsIfNeeded(containerType, containerId, { force: true });
    showToast(t("admins.adminCreated"), "success");
  };

  // Handle remove admin
  const handleOpenRemoveModal = (admin: UnifiedAdmin) => {
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
        containerType,
        containerId,
        userId: adminToRemove.id,
      });

      showToast(t("admins.adminRemoved"), "success");
      setIsRemoveModalOpen(false);
      setAdminToRemove(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setRemoving(false);
    }
  };

  // Determine permissions
  const primaryOwner = admins?.find((a) => a.isPrimaryOwner);
  const isOwner = containerType === "organization" && primaryOwner?.id === user?.id;
  const canManageAdmins = isRoot || isOwner;

  // Check if an owner already exists to determine allowed roles
  const hasOwner = containerType === "organization" && !!primaryOwner;
  const allowedRoles: import("@/types/adminWizard").AdminRole[] = 
    containerType === "organization"
      ? hasOwner
        ? ["ORGANIZATION_ADMIN"]
        : ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"]
      : ["CLUB_OWNER", "CLUB_ADMIN"];

  // Sort admins: Owner first (for orgs), then by creation date
  const sortedAdmins = admins
    ? [...admins].sort((a, b) => {
        if (containerType === "organization") {
          if (a.isPrimaryOwner) return -1;
          if (b.isPrimaryOwner) return 1;
        }
        return 0;
      })
    : [];

  // Check if user can modify a specific admin
  const canModifyAdmin = (admin: UnifiedAdmin) => {
    // Root Admin can modify anyone
    if (isRoot) return true;

    if (containerType === "organization") {
      // Owner cannot be modified by non-root users
      if (admin.isPrimaryOwner) {
        return false;
      }

      // Organization Owner can modify other admins
      if (isOwner) return true;
    }

    // For clubs, only root and org admins can modify (handled by canManageAdmins)
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

  // Format role for display
  const formatRole = (role: UnifiedAdmin["role"]) => {
    switch (role) {
      case "ORGANIZATION_OWNER":
        return t("roles.organizationOwner");
      case "ORGANIZATION_ADMIN":
        return t("roles.organizationAdmin");
      case "CLUB_OWNER":
        return t("roles.clubOwner");
      case "CLUB_ADMIN":
        return t("roles.clubAdmin");
      default:
        return role;
    }
  };

  // Loading state
  if (isLoadingAdmins && !admins) {
    return <TableSkeleton rows={3} columns={4} />;
  }

  return (
    <div className="admins-table-container">
      {/* Header */}
      <div className="admins-table-header">
        <h3 className="admins-table-title">
          {containerType === "organization"
            ? t("admins.organizationAdmins")
            : t("admins.clubAdmins")}
        </h3>
        {canManageAdmins && (
          <Button
            variant="primary"
            size="medium"
            onClick={handleOpenCreateAdminModal}
          >
            {t("admins.addAdmin")}
          </Button>
        )}
      </div>

      {/* Admins Table */}
      {sortedAdmins.length === 0 ? (
        <div className="admins-table-empty">
          <p>{t("admins.noAdmins")}</p>
        </div>
      ) : (
        <div className="admins-table">
          <table>
            <thead>
              <tr>
                <th>{t("admins.user")}</th>
                <th>{t("admins.role")}</th>
                <th>{t("admins.addedAt")}</th>
                <th>{t("admins.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedAdmins.map((admin) => (
                <tr key={admin.id}>
                  {/* User Info */}
                  <td>
                    <div className="admin-user-info">
                      <div className="admin-avatar">
                        {getInitials(admin.name, admin.email)}
                      </div>
                      <div className="admin-details">
                        <div className="admin-name">
                          {admin.name || t("admins.unnamed")}
                        </div>
                        <div className="admin-email">{admin.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td>
                    <Badge
                      variant={admin.role.includes("OWNER") ? "primary" : "secondary"}
                    >
                      {formatRole(admin.role)}
                    </Badge>
                  </td>

                  {/* Added Date */}
                  <td>
                    {admin.createdAt
                      ? new Date(admin.createdAt).toLocaleDateString()
                      : "-"}
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="admin-actions">
                      <Tooltip content={t("admins.viewProfile")}>
                        <Button
                          variant="ghost"
                          size="small"
                          onClick={() => handleViewProfile(admin.id)}
                        >
                          {t("admins.view")}
                        </Button>
                      </Tooltip>

                      {canModifyAdmin(admin) && (
                        <Tooltip content={t("admins.removeAdmin")}>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleOpenRemoveModal(admin)}
                          >
                            {t("admins.remove")}
                          </Button>
                        </Tooltip>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Admin Modal */}
      {isCreateAdminModalOpen && (
        <CreateAdminModal
          config={{
            defaultOrgId: containerType === "organization" ? containerId : clubData?.organizationId,
            organizationData: containerType === "organization" ? organizationData : undefined,
            defaultClubId: containerType === "club" ? containerId : undefined,
            clubData: containerType === "club" ? clubData : undefined,
            allowedRoles,
            context: containerType === "organization" ? "organization" : "club",
            onSuccess: handleAdminCreated,
            onCancel: handleCloseCreateAdminModal,
          }}
        />
      )}

      {/* Remove Admin Modal */}
      {isRemoveModalOpen && adminToRemove && (
        <Modal
          isOpen={isRemoveModalOpen}
          onClose={() => setIsRemoveModalOpen(false)}
          title={t("admins.removeAdminConfirm")}
        >
          <div className="modal-content">
            <p>
              {t("admins.removeAdminMessage", {
                name: adminToRemove.name || adminToRemove.email,
              })}
            </p>
            {removeError && (
              <div className="error-message">{removeError}</div>
            )}
            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setIsRemoveModalOpen(false)}
                disabled={removing}
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleRemoveAdmin}
                disabled={removing}
              >
                {removing ? t("common.removing") : t("admins.remove")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* User Profile Modal */}
      {isViewProfileModalOpen && selectedAdminUserId && (
        <UserProfileModal
          userId={selectedAdminUserId}
          isOpen={isViewProfileModalOpen}
          onClose={() => {
            setIsViewProfileModalOpen(false);
            setSelectedAdminUserId(null);
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
