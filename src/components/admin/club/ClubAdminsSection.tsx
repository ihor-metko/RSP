"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Input } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { UserProfileModal } from "../UserProfileModal";

interface ClubAdmin {
  id: string;
  name: string | null;
  email: string;
}

interface ClubAdminsSectionProps {
  clubId: string;
  onRefresh?: () => void;
}

export function ClubAdminsSection({
  clubId,
  onRefresh,
}: ClubAdminsSectionProps) {
  const t = useTranslations();
  const hasAnyRole = useUserStore((state) => state.hasAnyRole);
  
  const [admins, setAdmins] = useState<ClubAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add club admin modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Remove club admin modal state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<ClubAdmin | null>(null);
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

  // Check if user can manage club admins (Root Admin or Organization Admin)
  const canManageClubAdmins = hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"]);

  // Fetch club admins
  const fetchClubAdmins = async () => {
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch(`/api/admin/clubs/${clubId}/admins`);
      
      if (!response.ok) {
        if (response.status === 403) {
          setError(t("common.forbidden"));
          return;
        }
        throw new Error("Failed to fetch club admins");
      }

      const data = await response.json();
      setAdmins(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load club admins");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClubAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // fetchClubAdmins is defined inline and changes on every render, but we only want to refetch when clubId changes
  }, [clubId]);

  // Handle add club admin
  const handleOpenAddModal = async () => {
    setAddMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setNewUserName("");
    setNewUserEmail("");
    setNewUserPassword("");
    setAddError("");
    setIsAddModalOpen(true);
    await fetchSimpleUsers();
  };

  const handleAddClubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);

    try {
      const payload =
        addMode === "new"
          ? {
              createNew: true,
              name: newUserName,
              email: newUserEmail,
              password: newUserPassword,
            }
          : {
              createNew: false,
              userId: selectedUserId,
            };

      const response = await fetch(`/api/admin/clubs/${clubId}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to add club admin");
      }

      showToast(t("clubAdmins.adminAdded"), "success");
      setIsAddModalOpen(false);
      fetchClubAdmins();
      if (onRefresh) onRefresh();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to add club admin"
      );
    } finally {
      setAdding(false);
    }
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

  // Debounced user search
  const handleUserSearchChange = (value: string) => {
    setUserSearch(value);
  };

  // Debounce user search
  useEffect(() => {
    if (!isAddModalOpen || addMode !== "existing") return;

    const timer = setTimeout(() => {
      fetchSimpleUsers(userSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearch, isAddModalOpen, addMode, fetchSimpleUsers]);

  // Handle view profile
  const handleViewProfile = (userId: string) => {
    setSelectedAdminUserId(userId);
    setIsViewProfileModalOpen(true);
  };

  if (loading) {
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
            <Button size="small" onClick={handleOpenAddModal}>
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
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td>{admin.name || admin.email}</td>
                  <td>{admin.email}</td>
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

      {/* Add Club Admin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t("clubAdmins.addAdmin")}
      >
        <form onSubmit={handleAddClubAdmin} className="space-y-4">
          {addError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {addError}
            </div>
          )}

          <div className="im-assign-mode-tabs">
            <button
              type="button"
              className={`im-assign-mode-tab ${
                addMode === "existing" ? "im-assign-mode-tab--active" : ""
              }`}
              onClick={() => setAddMode("existing")}
            >
              {t("clubAdmins.existingUser")}
            </button>
            <button
              type="button"
              className={`im-assign-mode-tab ${
                addMode === "new" ? "im-assign-mode-tab--active" : ""
              }`}
              onClick={() => setAddMode("new")}
            >
              {t("clubAdmins.newUser")}
            </button>
          </div>

          {addMode === "existing" ? (
            <>
              <Input
                label={t("clubAdmins.searchUsers")}
                value={userSearch}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                placeholder={t("clubAdmins.searchUsersPlaceholder")}
              />
              <div className="im-user-list">
                {simpleUsers.length === 0 ? (
                  <p className="im-user-list-empty">{t("clubAdmins.noUsersFound")}</p>
                ) : (
                  simpleUsers.map((u) => (
                    <label
                      key={u.id}
                      className={`im-user-option ${
                        selectedUserId === u.id ? "im-user-option--selected" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="userId"
                        value={u.id}
                        checked={selectedUserId === u.id}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                      />
                      <span className="im-user-info">
                        <span className="im-user-name">{u.name || u.email}</span>
                        <span className="im-user-email">{u.email}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <Input
                label={t("common.name")}
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                required
              />
              <Input
                label={t("common.email")}
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
              <Input
                label={t("common.password")}
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                required
              />
            </>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                adding ||
                (addMode === "existing" && !selectedUserId) ||
                (addMode === "new" && (!newUserName || !newUserEmail || !newUserPassword))
              }
            >
              {adding ? t("common.processing") : t("clubAdmins.addAdmin")}
            </Button>
          </div>
        </form>
      </Modal>

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
              item: adminToRemove?.name || adminToRemove?.email,
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
