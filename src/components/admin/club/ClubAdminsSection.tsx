"use client";

import { useTranslations } from "next-intl";
import { useUserStore } from "@/stores/useUserStore";
import UnifiedAdminsTable from "../UnifiedAdminsTable";

interface ClubAdminsSectionProps {
  clubId: string;
  onRefresh?: () => void;
  /**
   * Optional club data to avoid fetching when already available
   * Passed from parent to prevent unnecessary network requests
   */
  clubData?: {
    id: string;
    name: string;
    organizationId: string;
  };
  /**
   * Optional organization data to avoid fetching
   * Passed from parent when available
   */
  organizationData?: {
    id: string;
    name: string;
    slug: string;
  };
}

export function ClubAdminsSection({
  clubId,
  clubData,
  organizationData,
}: ClubAdminsSectionProps) {
  const t = useTranslations();

  return (
    <div className="im-section-card">
      <UnifiedAdminsTable
        containerType="club"
        containerId={clubId}
        containerName={clubData?.name}
        clubData={clubData}
      />
    </div>
  );
}
    try {
      await fetchClubAdminsIfNeeded(clubId, { force: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load club admins";
      if (errorMessage.includes("403")) {
        setError(t("common.forbidden"));
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
    // Note: fetchClubAdminsIfNeeded is a Zustand store action with a stable reference.
    // The translation function 't' also has a stable reference in next-intl.
    // Including them would not change behavior but could trigger unnecessary re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, t]);

  // Sync store error with local error state
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Fetch admins only once on mount or when clubId changes
  useEffect(() => {
    fetchClubAdmins();
    // Note: fetchClubAdmins is defined above with useCallback, but including it in deps
    // would cause infinite loops due to its internal dependencies.
    // We only want to fetch when clubId changes, not when the callback changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId]);

  // Handle create admin modal
  const handleOpenCreateAdminModal = () => {
    setIsCreateAdminModalOpen(true);
  };

  const handleCloseCreateAdminModal = () => {
    setIsCreateAdminModalOpen(false);
  };

  // Handle remove club admin
  const handleOpenRemoveModal = (admin: ClubAdmin) => {
    setAdminToRemove(admin);
    setRemoveError("");
    setIsRemoveModalOpen(true);
  };

  const handleRemoveClubAdmin = async () => {
    if (!adminToRemove) return;

    setRemoveError("");
    setRemoving(true);

    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminToRemove.id }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove club admin");
      }

      showToast(t("clubAdmins.adminRemoved"), "success");
      setIsRemoveModalOpen(false);
      setAdminToRemove(null);
      
      // Force refetch to get updated admins list
      fetchClubAdmins();
      if (onRefresh) onRefresh();
    } catch (err) {
      setRemoveError(
        err instanceof Error ? err.message : "Failed to remove club admin"
      );
    } finally {
      setRemoving(false);
    }
  };

  // Handle view profile
  const handleViewProfile = (userId: string) => {
    setSelectedAdminUserId(userId);
    setIsViewProfileModalOpen(true);
  };

  // Sort admins: Owner first, then Club Admins
  const sortedAdmins = [...admins].sort((a, b) => {
    if (a.role === "CLUB_OWNER") return -1;
    if (b.role === "CLUB_OWNER") return 1;
    return 0;
  });

  if (loading || storeLoading) {
    return (
      <div className="im-section-card">
        <div className="im-section-header">
          <h3 className="im-section-title">{t("clubAdmins.title")}</h3>
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
      <div className="im-section-card">
        <div className="im-section-header">
          <h3 className="im-section-title">{t("clubAdmins.title")}</h3>
        </div>
        <div className="im-error-state">{error}</div>
      </div>
    );
  }

  return (
    <div className="im-section-card">
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
      )}

      <div className="im-section-header">
        <div className="im-section-icon im-section-icon--users">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="im-section-title">{t("clubAdmins.title")}</h3>
        <div className="im-section-actions">
          {canManageClubAdmins && (
            <Button size="small" onClick={handleOpenCreateAdminModal}>
              {t("clubAdmins.addAdmin")}
            </Button>
          )}
        </div>
      </div>

      {admins.length === 0 ? (
        <p className="im-empty-state">{t("clubAdmins.noAdmins")}</p>
      ) : (
        <div className="im-table-container">
          <table className="im-table">
            <thead>
              <tr>
                <th>{t("common.name")}</th>
                <th>{t("common.email")}</th>
                <th>{t("common.role")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedAdmins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name || admin.email}</td>
                  <td>{admin.email}</td>
                  <td>
                    {admin.role === "CLUB_OWNER" ? (
                      <Badge variant="success" size="small">
                        {t("clubAdmins.owner")}
                      </Badge>
                    ) : (
                      <Badge variant="info" size="small">
                        {t("clubAdmins.admin")}
                      </Badge>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        size="small"
                        variant="outline"
                        onClick={() => handleViewProfile(admin.id)}
                      >
                        {t("common.viewProfile")}
                      </Button>
                      {canManageClubAdmins && (
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => handleOpenRemoveModal(admin)}
                          disabled={admin.role === "CLUB_OWNER"}
                        >
                          {t("common.remove")}
                        </Button>
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
      <CreateAdminModal
        isOpen={isCreateAdminModalOpen}
        onClose={handleCloseCreateAdminModal}
        config={{
          context: "club",
          defaultClubId: clubId,
          clubData: clubData,
          organizationData: organizationData,
          allowedRoles: allowedRoles,
          onSuccess: () => {
            // Force refresh the admins list after successful creation
            fetchClubAdmins();
            if (onRefresh) onRefresh();
          },
        }}
      />

      {/* Remove Club Admin Modal */}
      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        title={t("clubAdmins.removeAdmin")}
      >
        <div className="space-y-4">
          {removeError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {removeError}
            </div>
          )}

          <p>
            {t("common.confirmRemove", {
              item: adminToRemove?.name || adminToRemove?.email || "",
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
            <Button variant="danger" onClick={handleRemoveClubAdmin} disabled={removing}>
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
