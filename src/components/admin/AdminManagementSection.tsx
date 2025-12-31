"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Badge } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminsStore } from "@/stores/useAdminsStore";
import type { Admin, AdminContext } from "@/stores/useAdminsStore";
import { UserProfileModal } from "./UserProfileModal";
import { CreateAdminModal } from "./admin-wizard";
import type { AdminRole } from "@/types/adminWizard";
import "./OrganizationAdminsTable.css";

interface AdminManagementSectionProps {
  /**
   * Context type: "organization" or "club"
   */
  context: AdminContext;
  
  /**
   * ID of the organization or club
   */
  contextId: string;
  
  /**
   * Optional organization data to avoid fetching when already available
   * Used for both organization context and club context (parent organization)
   */
  organizationData?: {
    id: string;
    name: string;
    slug: string;
  };
  
  /**
   * Optional club data (only used when context is "club")
   */
  clubData?: {
    id: string;
    name: string;
    organizationId: string;
  };
}

/**
 * AdminManagementSection - Unified reusable component for managing admins/owners
 * 
 * This component handles admin/owner management for both Organizations and Clubs.
 * It provides:
 * - Add admin/owner functionality
 * - Remove admin/owner functionality
 * - Role selection with proper restrictions
 * - Optimistic updates via unified store
 * - Proper permission checks based on user role
 * 
 * Based on the Organization admin table implementation with full support for Clubs.
 */
export default function AdminManagementSection({
  context,
  contextId,
  organizationData,
  clubData,
}: AdminManagementSectionProps) {
  const t = useTranslations();
  const user = useUserStore((state) => state.user);
  const hasAnyRole = useUserStore((state) => state.hasAnyRole);
  const isRoot = user?.isRoot ?? false;
  
  // Get organization detail from store if needed (for organization context)
  const getOrganizationDetailById = useOrganizationStore((state) => state.getOrganizationDetailById);
  const org = context === "organization" && !organizationData 
    ? getOrganizationDetailById(contextId)
    : organizationData;

  // Use unified admins store
  const getAdmins = useAdminsStore((state) => state.getAdmins);
  const fetchAdminsIfNeeded = useAdminsStore((state) => state.fetchAdminsIfNeeded);
  const removeAdminFromStore = useAdminsStore((state) => state.removeAdmin);
  const storeLoading = useAdminsStore((state) => state.isLoading(context, contextId));
  const storeError = useAdminsStore((state) => state.error);

  // Get admins from store
  const storeAdmins = getAdmins(context, contextId) || [];

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
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      await fetchAdminsIfNeeded(context, contextId, { force: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Failed to load ${context} admins`;
      if (errorMessage.includes("403")) {
        setError(t("common.forbidden"));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [context, contextId, fetchAdminsIfNeeded, t]);

  // Sync store error with local error state
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Fetch admins only once on mount or when contextId changes
  useEffect(() => {
    fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextId]);

  // Early validation - for club context, we need clubData
  if (context === "club" && !clubData) {
    return (
      <div className="im-section-card">
        <div className="im-org-admins-section">
          <div className="im-section-header">
            <h3 className="im-section-title">{t("clubAdmins.title")}</h3>
          </div>
          <div className="im-error-state">
            {t("common.error")}
          </div>
        </div>
      </div>
    );
  }

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
      // Call API to remove admin - use centralized endpoints
      const endpoint = context === "organization"
        ? `/api/admin/organizations/${contextId}/admins`
        : `/api/admin/clubs/${contextId}/admins`;
        
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminToRemove.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to remove admin" }));
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      // Update store optimistically - remove admin from local cache
      removeAdminFromStore(context, contextId, adminToRemove.id);

      const successMessage = context === "organization" 
        ? t("orgAdmins.adminRemoved") 
        : t("clubAdmins.adminRemoved");
      showToast(successMessage, "success");
      setIsRemoveModalOpen(false);
      setAdminToRemove(null);
      
      // DO NOT refetch organization/club details or admins list
      // The store has been updated optimistically and will reflect the changes
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setRemoving(false);
    }
  };

  // Determine permissions and roles
  const ownerRole = context === "organization" ? "ORGANIZATION_OWNER" : "CLUB_OWNER";
  const adminRole = context === "organization" ? "ORGANIZATION_ADMIN" : "CLUB_ADMIN";
  
  // Find the owner
  const primaryOwner = storeAdmins.find((a) => a.role === ownerRole);
  const isOwner = primaryOwner?.id === user?.id;
  
  // Permission checks
  const canManageAdmins = context === "organization"
    ? (isRoot || isOwner)
    : hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"]);

  // Check if an owner already exists to determine allowed roles
  const hasOwner = !!primaryOwner;
  const allowedRoles: AdminRole[] = hasOwner
    ? [adminRole]
    : [ownerRole, adminRole];

  // Sort admins: Owner first, then Admins
  const sortedAdmins = [...storeAdmins].sort((a, b) => {
    if (a.role === ownerRole) return -1;
    if (b.role === ownerRole) return 1;
    return 0;
  });

  // Check if user can modify a specific admin
  const canModifyAdmin = (admin: Admin) => {
    // Root Admin can modify anyone except prevent owner self-removal
    if (isRoot) {
      // Prevent owner from removing themselves
      if (admin.role === ownerRole && admin.id === user?.id) {
        return false;
      }
      return true;
    }

    // Owner cannot remove themselves
    if (admin.id === user?.id && admin.role === ownerRole) {
      return false;
    }

    // Organization Owner (in organization context) can modify other admins (not themselves)
    if (context === "organization" && isOwner && admin.id !== user?.id) {
      // Owner can remove other admins, but not other owners (only root can do that)
      if (admin.role === ownerRole) {
        return false;
      }
      return true;
    }

    // For club context, organization admins can manage club admins
    if (context === "club" && hasAnyRole(["ORGANIZATION_ADMIN"])) {
      // Club owner cannot remove themselves
      if (admin.role === ownerRole && admin.id === user?.id) {
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

  // Get title based on context
  const getTitle = () => {
    if (context === "organization") {
      return t("orgAdmins.administratorsAndOwners");
    }
    return t("clubAdmins.title");
  };

  // Get add button label
  const getAddButtonLabel = () => {
    if (context === "organization") {
      return isRoot ? t("orgAdmins.addAdminOrOwner") : t("orgAdmins.addAdmin");
    }
    return t("clubAdmins.addAdmin");
  };

  // Get role badge
  const getRoleBadge = (admin: Admin) => {
    if (admin.role === ownerRole) {
      return (
        <Badge variant="success" size="small">
          {context === "organization" ? t("orgAdmins.owner") : t("clubAdmins.owner")}
        </Badge>
      );
    }
    return (
      <Badge variant="info" size="small">
        {context === "organization" ? t("orgAdmins.orgAdmin") : t("clubAdmins.admin")}
      </Badge>
    );
  };

  // Show loading spinner while loading admins
  if (loading || storeLoading) {
    return (
      <div className="im-section-card">
        <div className="im-org-admins-section">
          <div className="im-section-header">
            <h3 className="im-section-title">{getTitle()}</h3>
          </div>
          <div className="im-loading-state">
            <div className="im-loading-spinner" />
            <span>{t("common.loading")}</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="im-section-card">
        <div className="im-org-admins-section">
          <div className="im-section-header">
            <h3 className="im-section-title">{getTitle()}</h3>
          </div>
          <div className="im-error-state">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="im-section-card">
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
        <h3 className="im-section-title">{getTitle()}</h3>
        <div className="im-section-actions">
          {canManageAdmins && (
            <Button onClick={handleOpenCreateAdminModal}>
              {getAddButtonLabel()}
            </Button>
          )}
        </div>
      </div>

      {storeAdmins.length === 0 ? (
        <p className="im-empty-state">
          {context === "organization" ? t("orgAdmins.noPeople") : t("clubAdmins.noAdmins")}
        </p>
      ) : (
        <div className="im-admins-list">
          {sortedAdmins.map((admin) => {
            const canModify = canModifyAdmin(admin);
            const isCurrentUserOwner = admin.role === ownerRole && admin.id === user?.id;

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
                    {getRoleBadge(admin)}
                  </div>
                  <span className="im-admin-email">{admin.email}</span>
                  {isRoot && admin.lastLoginAt && (
                    <span className="im-admin-meta">
                      {t("orgAdmins.lastLogin")}:{" "}
                      {new Date(admin.lastLoginAt).toLocaleDateString()}
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
          context: context,
          defaultOrgId: context === "organization" ? contextId : clubData?.organizationId,
          defaultClubId: context === "club" ? contextId : undefined,
          organizationData: org ? {
            id: org.id,
            name: org.name,
            slug: org.slug,
          } : undefined,
          clubData: clubData,
          allowedRoles: allowedRoles,
          onSuccess: async () => {
            // Optimistically add the admin to the store
            // We need to refetch to get the complete admin data with membershipId
            // but we do this silently without triggering page refresh
            try {
              await fetchAdminsIfNeeded(context, contextId, { force: true });
            } catch (err) {
              console.error("Failed to refresh admins after creation:", err);
            }
            // DO NOT call onRefresh - we only update the admin list
          },
        }}
      />

      {/* Remove Admin Modal */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title={context === "organization" ? t("orgAdmins.removeAdmin") : t("clubAdmins.removeAdmin")}
      >
        <div className="space-y-4">
          {removeError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {removeError}
            </div>
          )}

          <p>
            {context === "organization"
              ? t("orgAdmins.removeConfirm", {
                  name: adminToRemove?.name || adminToRemove?.email || "",
                })
              : t("common.confirmRemove", {
                  item: adminToRemove?.name || adminToRemove?.email || "",
                })
            }
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
    </div>
  );
}
