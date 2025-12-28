"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Badge, Tooltip } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminsStore } from "@/stores/useAdminsStore";
import type { Admin } from "@/stores/useAdminsStore";
import { UserProfileModal } from "./UserProfileModal";
import { CreateAdminModal } from "./admin-wizard";
import "./OrganizationAdminsTable.css";

interface OrganizationAdminsTableProps {
  orgId: string;
  onRefresh?: () => void;
  /**
   * Optional organization data to avoid fetching when already available
   * Passed from parent to prevent unnecessary network requests
   */
  organizationData?: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function OrganizationAdminsTable({
  orgId,
  onRefresh,
  organizationData,
}: OrganizationAdminsTableProps) {
  const t = useTranslations();
  const user = useUserStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;
  const removeAdmin = useOrganizationStore((state) => state.removeAdmin);

  // Get organization detail from store to pass to modal (avoids fetching)
  const getOrganizationDetailById = useOrganizationStore((state) => state.getOrganizationDetailById);
  const org = organizationData || getOrganizationDetailById(orgId);

  // Use unified admins store
  const getAdmins = useAdminsStore((state) => state.getAdmins);
  const fetchAdminsIfNeeded = useAdminsStore((state) => state.fetchAdminsIfNeeded);
  const storeLoading = useAdminsStore((state) => state.isLoading("organization", orgId));
  const storeError = useAdminsStore((state) => state.error);

  // Get admins from store
  const storeAdmins = getAdmins("organization", orgId) || [];

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Create Admin modal state
  const [isCreateAdminModalOpen, setIsCreateAdminModalOpen] = useState(false);

  // Remove admin modal state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<Admin | null>(null);
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

  // Fetch admins from store
  const fetchOrgAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      await fetchAdminsIfNeeded("organization", orgId, { force: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load organization admins";
      if (errorMessage.includes("403")) {
        setError(t("common.forbidden"));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [orgId, fetchAdminsIfNeeded, t]);

  // Sync store error with local error state
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Fetch admins only once on mount or when orgId changes
  useEffect(() => {
    fetchOrgAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Handle create admin modal
  const handleOpenCreateAdminModal = () => {
    setIsCreateAdminModalOpen(true);
  };

  const handleCloseCreateAdminModal = () => {
    setIsCreateAdminModalOpen(false);
  };

  // Handle remove admin
  const handleOpenRemoveModal = (admin: Admin) => {
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
        userId: adminToRemove.id,
      });

      showToast(t("orgAdmins.adminRemoved"), "success");
      setIsRemoveModalOpen(false);
      setAdminToRemove(null);
      
      // Force refetch to get updated admins list
      fetchOrgAdmins();
      if (onRefresh) onRefresh();
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setRemoving(false);
    }
  };

  // Root Admin or Organization Owner can manage org admins
  const primaryOwner = storeAdmins.find((a) => a.role === "ORGANIZATION_OWNER");
  const isOwner = primaryOwner?.id === user?.id;
  const canManageAdmins = isRoot || isOwner;

  // Check if an owner already exists to determine allowed roles
  const hasOwner = !!primaryOwner;
  const allowedRoles: import("@/types/adminWizard").AdminRole[] = hasOwner
    ? ["ORGANIZATION_ADMIN"]
    : ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"];

  // Sort admins: Owner first, then Organization Admins
  const sortedAdmins = [...storeAdmins].sort((a, b) => {
    if (a.role === "ORGANIZATION_OWNER") return -1;
    if (b.role === "ORGANIZATION_OWNER") return 1;
    return 0;
  });

  // Check if user can modify a specific admin
  const canModifyAdmin = (admin: Admin) => {
    // Root Admin can modify anyone except prevent owner self-removal
    if (isRoot) {
      // Prevent owner from removing themselves
      if (admin.role === "ORGANIZATION_OWNER" && admin.id === user?.id) {
        return false;
      }
      return true;
    }

    // Owner cannot remove themselves
    if (admin.id === user?.id && admin.role === "ORGANIZATION_OWNER") {
      return false;
    }

    // Organization Owner can modify other admins (not themselves)
    if (isOwner && admin.id !== user?.id) {
      // Owner can remove other admins, but not other owners (only root can do that)
      if (admin.role === "ORGANIZATION_OWNER") {
        return false;
      }
      return true;
    }

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

  // Show loading spinner while loading admins
  if (loading || storeLoading) {
    return (
      <div className="im-org-admins-section">
        <div className="im-section-header">
          <h3 className="im-section-title">{t("orgAdmins.administratorsAndOwners")}</h3>
        </div>
        <div className="im-loading-state">
          <div className="im-loading-spinner" />
          <span>{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="im-org-admins-section">
        <div className="im-section-header">
          <h3 className="im-section-title">{t("orgAdmins.administratorsAndOwners")}</h3>
        </div>
        <div className="im-error-state">{error}</div>
      </div>
    );
  }

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

      {storeAdmins.length === 0 ? (
        <p className="im-empty-state">{t("orgAdmins.noPeople")}</p>
      ) : (
        <div className="im-admins-list">
          {sortedAdmins.map((admin) => {
            const canModify = canModifyAdmin(admin);
            const tooltipMessage = !canModify && admin.role === "ORGANIZATION_OWNER"
              ? t("orgAdmins.ownerProtectionTooltip")
              : "";
            const isCurrentUserOwner = admin.role === "ORGANIZATION_OWNER" && admin.id === user?.id;

            return (
              <div key={admin.membershipId} className="im-admin-row">
                <div className="im-admin-avatar">
                  {getInitials(admin.name, admin.email)}
                </div>
                <div className="im-admin-info">
                  <div className="im-admin-name-row">
                    <span className="im-admin-name">
                      {admin.name || admin.email}
                      {isCurrentUserOwner && (
                        <span className="im-admin-you-indicator"> ({t("orgAdmins.you")})</span>
                      )}
                    </span>
                    {admin.role === "ORGANIZATION_OWNER" ? (
                      <Badge variant="success" size="small">
                        {t("orgAdmins.owner")}
                      </Badge>
                    ) : (
                      <Badge variant="info" size="small">
                        {t("orgAdmins.orgAdmin")}
                      </Badge>
                    )}
                  </div>
                  <span className="im-admin-email">{admin.email}</span>
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
                    onClick={() => handleViewProfile(admin.id)}
                  >
                    {t("common.viewProfile")}
                  </Button>
                  {canModify && (
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
            // Force refresh the admins list after successful creation
            fetchOrgAdmins();
            if (onRefresh) onRefresh();
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
              name: adminToRemove?.name || adminToRemove?.email || "",
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
