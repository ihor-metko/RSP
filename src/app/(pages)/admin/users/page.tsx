"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, Select, Multiselect, PageHeader, Breadcrumbs } from "@/components/ui";
import { Roles } from "@/constants/roles";
import "./UserManagement.css";

interface Club {
  id: string;
  name: string;
}

interface UserWithClubs {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  clubs: Club[];
}

interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  clubIds: string[];
}

const initialFormData: UserFormData = {
  name: "",
  email: "",
  password: "",
  role: Roles.Admin,
  clubIds: [],
};

/**
 * Edit Icon Component
 */
function EditIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

/**
 * Delete Icon Component
 */
function DeleteIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

/**
 * User Management Page
 *
 * Allows Root Admin to view, create, edit, and delete Super Admin and Admin users.
 * Access restricted to users with root_admin role only.
 */
export default function UserManagementPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithClubs[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [clubFilter, setClubFilter] = useState("");

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithClubs | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserWithClubs | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter) params.set("role", roleFilter);
      if (clubFilter) params.set("clubId", clubFilter);

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
      setError("");
    } catch {
      setError(t("userManagement.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [router, t, searchQuery, roleFilter, clubFilter]);

  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/clubs");
      if (response.ok) {
        const data = await response.json();
        setClubs(data.map((club: { id: string; name: string }) => ({
          id: club.id,
          name: club.name,
        })));
      }
    } catch {
      // Clubs fetch failure is not critical
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== Roles.RootAdmin) {
      router.push("/auth/sign-in");
      return;
    }

    fetchUsers();
    fetchClubs();
  }, [session, status, router, fetchUsers, fetchClubs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (status !== "loading" && session?.user?.role === Roles.RootAdmin) {
        fetchUsers();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter, clubFilter, status, session, fetchUsers]);

  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormData(initialFormData);
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (user: UserWithClubs) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email,
      password: "",
      role: user.role,
      clubIds: user.clubs.map((c) => c.id),
    });
    setFormError("");
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (user: UserWithClubs) => {
    setDeletingUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormData(initialFormData);
    setFormError("");
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
    setFormData(initialFormData);
    setFormError("");
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingUser(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => {
      // If changing to admin and multiple clubs selected, keep only first
      const newClubIds = value === Roles.Admin && prev.clubIds.length > 1
        ? [prev.clubIds[0]]
        : prev.clubIds;
      return { ...prev, role: value, clubIds: newClubIds };
    });
  };

  const handleClubsChange = (values: string[]) => {
    // Admin can only have one club
    if (formData.role === Roles.Admin && values.length > 1) {
      setFormData((prev) => ({ ...prev, clubIds: [values[values.length - 1]] }));
    } else {
      setFormData((prev) => ({ ...prev, clubIds: values }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create user");
      }

      handleCloseCreateModal();
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setFormError("");
    setSubmitting(true);

    try {
      // Only send fields that have changed
      const updateData: Partial<UserFormData> = {};
      if (formData.name !== editingUser.name) updateData.name = formData.name;
      if (formData.email !== editingUser.email) updateData.email = formData.email;
      if (formData.role !== editingUser.role) updateData.role = formData.role;

      // Check if clubs have changed
      const existingClubIds = editingUser.clubs.map((c) => c.id).sort();
      const newClubIds = [...formData.clubIds].sort();
      if (JSON.stringify(existingClubIds) !== JSON.stringify(newClubIds)) {
        updateData.clubIds = formData.clubIds;
      }

      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update user");
      }

      handleCloseEditModal();
      fetchUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete user");
      }

      handleCloseDeleteModal();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case Roles.SuperAdmin:
        return "im-role-badge im-role-badge--super-admin";
      case Roles.Admin:
        return "im-role-badge im-role-badge--admin";
      default:
        return "im-role-badge";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case Roles.SuperAdmin:
        return t("userManagement.roles.superAdmin");
      case Roles.Admin:
        return t("userManagement.roles.admin");
      default:
        return role;
    }
  };

  const roleOptions = [
    { value: "", label: t("common.allRoles") },
    { value: Roles.SuperAdmin, label: t("userManagement.roles.superAdmin") },
    { value: Roles.Admin, label: t("userManagement.roles.admin") },
  ];

  const clubOptions = [
    { value: "", label: t("userManagement.allClubs") },
    ...clubs.map((club) => ({ value: club.id, label: club.name })),
  ];

  const formRoleOptions = [
    { value: Roles.SuperAdmin, label: t("userManagement.roles.superAdmin") },
    { value: Roles.Admin, label: t("userManagement.roles.admin") },
  ];

  const clubMultiselectOptions = clubs.map((club) => ({
    value: club.id,
    label: club.name,
  }));

  if (status === "loading" || loading) {
    return (
      <main className="im-user-management-page">
        <div className="im-user-management-loading">
          <div className="im-user-management-loading-spinner" />
          <span className="im-user-management-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="im-user-management-page">
      <PageHeader
        title={t("userManagement.title")}
        description={t("userManagement.subtitle")}
      />

      <section className="rsp-content">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
            { label: t("userManagement.breadcrumb") },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        {/* Actions Bar */}
        <div className="im-user-management-actions">
          <div className="im-user-management-actions-left">
            <div className="im-user-filters">
              <Input
                placeholder={t("userManagement.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="im-user-search-input"
              />
              <Select
                options={roleOptions}
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder={t("common.allRoles")}
                className="im-user-filter-select"
              />
              <Select
                options={clubOptions}
                value={clubFilter}
                onChange={setClubFilter}
                placeholder={t("userManagement.allClubs")}
                className="im-user-filter-select"
              />
            </div>
          </div>
          <div className="im-user-management-actions-right">
            <Button onClick={handleOpenCreateModal}>
              {t("userManagement.createUser")}
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="im-user-management-error">
            {error}
          </div>
        )}

        {/* Users Table */}
        {users.length === 0 ? (
          <div className="im-users-empty">
            <p className="im-users-empty-text">
              {t("userManagement.noUsers")}
            </p>
          </div>
        ) : (
          <div className="im-users-table-container">
            <table className="im-users-table">
              <thead>
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("userManagement.role")}</th>
                  <th>{t("userManagement.assignedClubs")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="im-user-info">
                        <span className="im-user-name">{user.name || "-"}</span>
                        <span className="im-user-email">{user.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td>
                      <div className="im-club-tags">
                        {user.clubs.length === 0 ? (
                          <span className="im-club-tag im-club-tag--more">
                            {t("userManagement.noClubsAssigned")}
                          </span>
                        ) : (
                          <>
                            {user.clubs.slice(0, 3).map((club) => (
                              <span key={club.id} className="im-club-tag">
                                {club.name}
                              </span>
                            ))}
                            {user.clubs.length > 3 && (
                              <span className="im-club-tag im-club-tag--more">
                                +{user.clubs.length - 3}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="im-user-actions">
                        <button
                          className="im-action-button im-action-button--edit"
                          onClick={() => handleOpenEditModal(user)}
                          title={t("common.edit")}
                          aria-label={t("userManagement.editUser", { name: user.name || user.email })}
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="im-action-button im-action-button--delete"
                          onClick={() => handleOpenDeleteModal(user)}
                          title={t("common.delete")}
                          aria-label={t("userManagement.deleteUser", { name: user.name || user.email })}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title={t("userManagement.createUser")}
      >
        <form onSubmit={handleCreateSubmit} className="im-user-form">
          {formError && (
            <div className="im-user-management-error">
              {formError}
            </div>
          )}
          <div className="im-user-form-row">
            <Input
              label={t("common.name")}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("userManagement.namePlaceholder")}
              required
            />
            <Input
              label={t("common.email")}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t("userManagement.emailPlaceholder")}
              required
            />
          </div>
          <Input
            label={t("common.password")}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder={t("userManagement.passwordPlaceholder")}
            showPasswordToggle
            required
          />
          <Select
            label={t("userManagement.role")}
            options={formRoleOptions}
            value={formData.role}
            onChange={handleRoleChange}
            required
          />
          <Multiselect
            label={t("userManagement.assignedClubs")}
            options={clubMultiselectOptions}
            value={formData.clubIds}
            onChange={handleClubsChange}
            placeholder={t("userManagement.selectClubs")}
          />
          {formData.role === Roles.Admin && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("userManagement.adminSingleClubNote")}
            </p>
          )}
          <div className="im-user-form-actions">
            <Button type="button" variant="outline" onClick={handleCloseCreateModal}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.processing") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        title={t("userManagement.editUser", { name: editingUser?.name || "" })}
      >
        <form onSubmit={handleEditSubmit} className="im-user-form">
          {formError && (
            <div className="im-user-management-error">
              {formError}
            </div>
          )}
          <div className="im-user-form-row">
            <Input
              label={t("common.name")}
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder={t("userManagement.namePlaceholder")}
            />
            <Input
              label={t("common.email")}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t("userManagement.emailPlaceholder")}
            />
          </div>
          <Select
            label={t("userManagement.role")}
            options={formRoleOptions}
            value={formData.role}
            onChange={handleRoleChange}
          />
          <Multiselect
            label={t("userManagement.assignedClubs")}
            options={clubMultiselectOptions}
            value={formData.clubIds}
            onChange={handleClubsChange}
            placeholder={t("userManagement.selectClubs")}
          />
          {formData.role === Roles.Admin && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("userManagement.adminSingleClubNote")}
            </p>
          )}
          <div className="im-user-form-actions">
            <Button type="button" variant="outline" onClick={handleCloseEditModal}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        title={t("userManagement.deleteUser", { name: "" })}
      >
        <p className="mb-4">
          {t("userManagement.deleteConfirm", { name: deletingUser?.name || deletingUser?.email || "" })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCloseDeleteModal}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            disabled={submitting}
            className="bg-red-500 hover:bg-red-600"
          >
            {submitting ? t("common.processing") : t("common.delete")}
          </Button>
        </div>
      </Modal>
    </main>
  );
}
