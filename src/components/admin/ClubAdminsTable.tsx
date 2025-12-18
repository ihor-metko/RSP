"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal, Input, Select } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { UserProfileModal } from "./UserProfileModal";

interface ClubAdmin {
  id: string;
  type: "clubadmin";
  userId: string;
  userName: string | null;
  userEmail: string;
  lastLoginAt: Date | null;
  clubs: Array<{ id: string; name: string; membershipId: string }>;
  createdAt: Date;
}

interface Club {
  id: string;
  name: string;
}

interface ClubAdminsTableProps {
  orgId: string;
  admins: ClubAdmin[];
  clubs: Club[];
  onRefresh: () => void;
}

export default function ClubAdminsTable({
  orgId,
  admins,
  clubs,
  onRefresh,
}: ClubAdminsTableProps) {
  const t = useTranslations();
  const user = useUserStore((state) => state.user);
  const isRoot = user?.isRoot ?? false;
  const isOrgAdmin = useUserStore((state) => state.isOrgAdmin);

  // Add club admin modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"existing" | "invite">("existing");
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit club admin modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [adminToEdit, setAdminToEdit] = useState<ClubAdmin | null>(null);
  const [selectedMembershipId, setSelectedMembershipId] = useState("");
  const [editClubId, setEditClubId] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  // Remove club admin modal state
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<{
    clubAdmin: ClubAdmin;
    membershipId: string;
    clubName: string;
  } | null>(null);
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

  // Handle add club admin
  const handleOpenAddModal = async () => {
    setAddMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setSelectedClubId("");
    setInviteName("");
    setInviteEmail("");
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
        addMode === "invite"
          ? {
              email: inviteEmail,
              name: inviteName,
              clubId: selectedClubId,
            }
          : {
              userId: selectedUserId,
              clubId: selectedClubId,
            };

      const response = await fetch(`/api/orgs/${orgId}/club-admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to assign club admin");
      }

      showToast(t("clubAdmins.adminAdded"), "success");
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to assign club admin"
      );
    } finally {
      setAdding(false);
    }
  };

  // Handle edit club admin (reassign to different club)
  const handleOpenEditModal = (admin: ClubAdmin) => {
    if (admin.clubs.length === 0) return;

    setAdminToEdit(admin);
    // Default to the first club membership
    const firstClub = admin.clubs[0];
    setSelectedMembershipId(firstClub.membershipId);
    setEditClubId(firstClub.id);
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleEditClubAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToEdit || !selectedMembershipId) return;

    setEditError("");
    setEditing(true);

    try {
      const response = await fetch(
        `/api/orgs/${orgId}/club-admins/${selectedMembershipId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubId: editClubId }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update club admin");
      }

      showToast(t("clubAdmins.adminUpdated"), "success");
      setIsEditModalOpen(false);
      setAdminToEdit(null);
      onRefresh();
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to update club admin"
      );
    } finally {
      setEditing(false);
    }
  };

  // Handle remove club admin
  const handleOpenRemoveModal = (
    clubAdmin: ClubAdmin,
    membershipId: string,
    clubName: string
  ) => {
    setAdminToRemove({ clubAdmin, membershipId, clubName });
    setRemoveError("");
    setIsRemoveModalOpen(true);
  };

  const handleRemoveClubAdmin = async () => {
    if (!adminToRemove) return;

    setRemoveError("");
    setRemoving(true);

    try {
      const response = await fetch(
        `/api/orgs/${orgId}/club-admins/${adminToRemove.membershipId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove club admin");
      }

      showToast(t("clubAdmins.adminRemoved"), "success");
      setIsRemoveModalOpen(false);
      setAdminToRemove(null);
      onRefresh();
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

  // Root Admin or Organization Admin can manage club admins
  const canManageClubAdmins = isRoot || isOrgAdmin(orgId);

  // Handle view profile
  const handleViewProfile = (userId: string) => {
    setSelectedAdminUserId(userId);
    setIsViewProfileModalOpen(true);
  };

  return (
    <div className="im-club-admins-section">
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
      )}

      <div className="im-section-header">
        <h3 className="im-section-title">{t("clubAdmins.title")}</h3>
        <div className="im-section-actions">
          {canManageClubAdmins && clubs.length > 0 && (
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
                <th>{t("clubAdmins.club")}</th>
                <th>{t("clubAdmins.lastLogin")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) =>
                admin.clubs.map((club) => (
                  <tr key={`${admin.userId}-${club.id}`}>
                    <td>{admin.userName || admin.userEmail}</td>
                    <td>{admin.userEmail}</td>
                    <td>
                      <span className="im-badge im-badge--info">{club.name}</span>
                    </td>
                    <td>
                      {admin.lastLoginAt
                        ? new Date(admin.lastLoginAt).toLocaleDateString()
                        : t("common.never")}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          variant="outline"
                          onClick={() => handleViewProfile(admin.userId)}
                        >
                          {t("common.viewProfile")}
                        </Button>
                        {canManageClubAdmins && (
                          <>
                            <Button
                              size="small"
                              variant="outline"
                              onClick={() => handleOpenEditModal(admin)}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              size="small"
                              variant="danger"
                              onClick={() =>
                                handleOpenRemoveModal(admin, club.membershipId, club.name)
                              }
                            >
                              {t("common.remove")}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                addMode === "invite" ? "im-assign-mode-tab--active" : ""
              }`}
              onClick={() => setAddMode("invite")}
            >
              {t("clubAdmins.inviteUser")}
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
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
              <Input
                label={t("common.email")}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </>
          )}

          <Select
            label={t("clubAdmins.selectClub")}
            value={selectedClubId}
            onChange={(value) => setSelectedClubId(value)}
            options={[
              { value: "", label: t("clubAdmins.selectClubPlaceholder"), disabled: true },
              ...clubs.map((club) => ({
                value: club.id,
                label: club.name,
              })),
            ]}
            placeholder={t("clubAdmins.selectClubPlaceholder")}
            required
          />

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
                !selectedClubId ||
                (addMode === "existing" && !selectedUserId) ||
                (addMode === "invite" && (!inviteName || !inviteEmail))
              }
            >
              {adding ? t("common.processing") : t("clubAdmins.addAdmin")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Club Admin Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t("clubAdmins.editAdmin")}
      >
        <form onSubmit={handleEditClubAdmin} className="space-y-4">
          {editError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {editError}
            </div>
          )}

          <p className="im-modal-description">
            {t("clubAdmins.editDescription", {
              name: adminToEdit?.userName || adminToEdit?.userEmail || "",
            })}
          </p>

          {adminToEdit && adminToEdit.clubs.length > 1 && (
            <Select
              label={t("clubAdmins.selectMembership")}
              value={selectedMembershipId}
              onChange={(value) => {
                setSelectedMembershipId(value);
                const club = adminToEdit.clubs.find(
                  (c) => c.membershipId === value
                );
                if (club) setEditClubId(club.id);
              }}
              options={adminToEdit.clubs.map((club) => ({
                value: club.membershipId,
                label: club.name,
              }))}
              required
            />
          )}

          <Select
            label={t("clubAdmins.reassignToClub")}
            value={editClubId}
            onChange={(value) => setEditClubId(value)}
            options={[
              { value: "", label: t("clubAdmins.selectClubPlaceholder"), disabled: true },
              ...clubs.map((club) => ({
                value: club.id,
                label: club.name,
              })),
            ]}
            placeholder={t("clubAdmins.selectClubPlaceholder")}
            required
          />

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={editing || !editClubId}>
              {editing ? t("common.processing") : t("common.save")}
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
            {t("clubAdmins.removeConfirm", {
              name:
                adminToRemove?.clubAdmin.userName ||
                adminToRemove?.clubAdmin.userEmail ||
                "",
              club: adminToRemove?.clubName || "",
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
