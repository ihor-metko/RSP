"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Input, Badge, Tooltip } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { UserProfileModal } from "./UserProfileModal";
import "./OrganizationAdminsTable.css";

interface OrgAdmin {
  id: string;
  type: "superadmin";
  userId: string;
  userName: string | null;
  userEmail: string;
  isPrimaryOwner: boolean;
  lastLoginAt: Date | null;
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
  const addAdmin = useOrganizationStore((state) => state.addAdmin);
  const removeAdmin = useOrganizationStore((state) => state.removeAdmin);
  const changeOwner = useOrganizationStore((state) => state.changeOwner);

  // Add admin modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Change owner modal state
  const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [changeOwnerError, setChangeOwnerError] = useState("");
  const [changingOwner, setChangingOwner] = useState(false);

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

  // Handle add admin
  const handleOpenAddModal = async () => {
    setAddMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPassword("");
    setAddError("");
    setIsAddModalOpen(true);
    await fetchSimpleUsers();
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    setAdding(true);

    try {
      const payload =
        addMode === "new"
          ? {
              organizationId: orgId,
              createNew: true,
              name: newAdminName,
              email: newAdminEmail,
              password: newAdminPassword,
            }
          : {
              organizationId: orgId,
              createNew: false,
              userId: selectedUserId,
            };

      await addAdmin(payload);

      showToast(t("orgAdmins.adminAdded"), "success");
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to assign admin");
    } finally {
      setAdding(false);
    }
  };

  // Handle change owner
  const handleOpenChangeOwnerModal = () => {
    setSelectedOwnerId("");
    setChangeOwnerError("");
    setIsChangeOwnerModalOpen(true);
  };

  const handleChangeOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangeOwnerError("");
    setChangingOwner(true);

    try {
      await changeOwner({
        organizationId: orgId,
        userId: selectedOwnerId,
      });

      showToast(t("orgAdmins.ownerChanged"), "success");
      setIsChangeOwnerModalOpen(false);
      onRefresh();
    } catch (err) {
      setChangeOwnerError(
        err instanceof Error ? err.message : "Failed to change owner"
      );
    } finally {
      setChangingOwner(false);
    }
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

  // Root Admin or Organization Owner (isPrimaryOwner) can manage org admins
  const primaryOwner = admins.find((a) => a.isPrimaryOwner);
  const isOwner = primaryOwner?.userId === user?.id;
  const canManageAdmins = isRoot || isOwner;

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
        <h3 className="im-section-title">{t("orgAdmins.title")}</h3>
        <div className="im-section-actions">
          {canManageAdmins && (
            <>
              <Button size="small" onClick={handleOpenAddModal}>
                {t("orgAdmins.addAdmin")}
              </Button>
              {admins.length > 0 && (
                <Button
                  size="small"
                  variant="outline"
                  onClick={handleOpenChangeOwnerModal}
                >
                  {t("orgAdmins.changeOwner")}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {admins.length === 0 ? (
        <p className="im-empty-state">{t("orgAdmins.noAdmins")}</p>
      ) : (
        <div className="im-admins-list">
          {admins.map((admin) => {
            const canModify = canModifyAdmin(admin);
            const tooltipMessage = !canModify && admin.isPrimaryOwner
              ? t("orgAdmins.ownerProtectionTooltip")
              : "";

            return (
              <div key={admin.id} className="im-admin-row">
                <div className="im-admin-avatar">
                  {getInitials(admin.userName, admin.userEmail)}
                </div>
                <div className="im-admin-info">
                  <div className="im-admin-name-row">
                    <span className="im-admin-name">
                      {admin.userName || admin.userEmail}
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
                  <span className="im-admin-meta">
                    {t("orgAdmins.lastLogin")}:{" "}
                    {admin.lastLoginAt
                      ? new Date(admin.lastLoginAt).toLocaleDateString()
                      : t("common.never")}
                  </span>
                </div>
                <div className="im-admin-actions">
                  <Button
                    size="small"
                    variant="outline"
                    onClick={() => handleViewProfile(admin.userId)}
                  >
                    {t("common.viewProfile")}
                  </Button>
                  {canModify ? (
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleOpenRemoveModal(admin)}
                    >
                      {t("common.remove")}
                    </Button>
                  ) : (
                    <Tooltip content={tooltipMessage}>
                      <span>
                        <Button
                          size="small"
                          variant="danger"
                          disabled
                        >
                          {t("common.remove")}
                        </Button>
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Admin Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t("orgAdmins.addAdmin")}
      >
        <form onSubmit={handleAddAdmin} className="space-y-4">
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
              {t("orgAdmins.existingUser")}
            </button>
            <button
              type="button"
              className={`im-assign-mode-tab ${
                addMode === "new" ? "im-assign-mode-tab--active" : ""
              }`}
              onClick={() => setAddMode("new")}
            >
              {t("orgAdmins.newUser")}
            </button>
          </div>

          {addMode === "existing" ? (
            <>
              <Input
                label={t("orgAdmins.searchUsers")}
                value={userSearch}
                onChange={(e) => handleUserSearchChange(e.target.value)}
                placeholder={t("orgAdmins.searchUsersPlaceholder")}
              />
              <div className="im-user-list">
                {simpleUsers.length === 0 ? (
                  <p className="im-user-list-empty">{t("orgAdmins.noUsersFound")}</p>
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
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                required
              />
              <Input
                label={t("common.email")}
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                required
              />
              <Input
                label={t("common.password")}
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
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
                (addMode === "new" &&
                  (!newAdminName || !newAdminEmail || !newAdminPassword))
              }
            >
              {adding ? t("common.processing") : t("orgAdmins.addAdmin")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Owner Modal */}
      <Modal
        isOpen={isChangeOwnerModalOpen}
        onClose={() => setIsChangeOwnerModalOpen(false)}
        title={t("orgAdmins.changeOwner")}
      >
        <form onSubmit={handleChangeOwner} className="space-y-4">
          {changeOwnerError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {changeOwnerError}
            </div>
          )}

          <p className="im-modal-description">{t("orgAdmins.changeOwnerDescription")}</p>

          <div className="im-user-list">
            {admins
              .filter((a) => !a.isPrimaryOwner)
              .map((admin) => (
                <label
                  key={admin.id}
                  className={`im-user-option ${
                    selectedOwnerId === admin.userId ? "im-user-option--selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="ownerId"
                    value={admin.userId}
                    checked={selectedOwnerId === admin.userId}
                    onChange={(e) => setSelectedOwnerId(e.target.value)}
                  />
                  <span className="im-user-info">
                    <span className="im-user-name">
                      {admin.userName || admin.userEmail}
                    </span>
                    <span className="im-user-email">{admin.userEmail}</span>
                  </span>
                </label>
              ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsChangeOwnerModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={changingOwner || !selectedOwnerId}>
              {changingOwner ? t("common.processing") : t("orgAdmins.changeOwner")}
            </Button>
          </div>
        </form>
      </Modal>

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
              name: adminToRemove?.userName || adminToRemove?.userEmail,
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
