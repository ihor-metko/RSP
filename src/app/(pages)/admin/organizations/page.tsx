"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, PageHeader, Breadcrumbs } from "@/components/ui";
import "./page.css";

interface OrganizationUser {
  id: string;
  name: string | null;
  email: string;
}

interface SuperAdmin extends OrganizationUser {
  isPrimaryOwner: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  clubCount: number;
  createdBy: OrganizationUser;
  superAdmin: OrganizationUser | null;
  superAdmins: SuperAdmin[];
}

interface User {
  id: string;
  name: string | null;
  email: string;
  isOrgAdmin: boolean;
  organizationName: string | null;
}

export default function AdminOrganizationsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for organizations list
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // State for create organization modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // State for assign admin modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [assignMode, setAssignMode] = useState<"existing" | "new">("existing");
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [assignError, setAssignError] = useState("");
  const [assigning, setAssigning] = useState(false);

  // State for manage admins modal
  const [isManageAdminsModalOpen, setIsManageAdminsModalOpen] = useState(false);
  const [managingOrg, setManagingOrg] = useState<Organization | null>(null);
  const [manageError, setManageError] = useState("");
  const [processing, setProcessing] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/organizations");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch organizations");
      }
      const data = await response.json();
      setOrganizations(data);
      setError("");
    } catch {
      setError(t("organizations.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  const fetchUsers = useCallback(async (query: string = "") => {
    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch {
      // Silent fail for user search
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || !session.user.isRoot) {
      router.push("/auth/sign-in");
      return;
    }

    fetchOrganizations();
  }, [session, status, router, fetchOrganizations]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAssignModalOpen && assignMode === "existing") {
        fetchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, isAssignModalOpen, assignMode, fetchUsers]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOrgName,
          slug: newOrgSlug || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create organization");
      }

      showToast(t("organizations.createSuccess"), "success");
      setIsCreateModalOpen(false);
      setNewOrgName("");
      setNewOrgSlug("");

      // Open assign admin modal for the new organization
      setSelectedOrg(data);
      setIsAssignModalOpen(true);
      fetchUsers();
      fetchOrganizations();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create organization");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenAssignModal = (org: Organization) => {
    setSelectedOrg(org);
    setAssignMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setNewAdminName("");
    setNewAdminEmail("");
    setNewAdminPassword("");
    setAssignError("");
    setIsAssignModalOpen(true);
    fetchUsers();
  };

  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedOrg(null);
    setAssignError("");
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError("");
    setAssigning(true);

    try {
      const payload =
        assignMode === "new"
          ? {
              organizationId: selectedOrg?.id,
              createNew: true,
              name: newAdminName,
              email: newAdminEmail,
              password: newAdminPassword,
            }
          : {
              organizationId: selectedOrg?.id,
              userId: selectedUserId,
            };

      const response = await fetch("/api/admin/organizations/assign-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign SuperAdmin");
      }

      showToast(t("organizations.assignSuccess"), "success");
      handleCloseAssignModal();
      fetchOrganizations();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Failed to assign SuperAdmin");
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenManageAdminsModal = (org: Organization) => {
    setManagingOrg(org);
    setManageError("");
    setIsManageAdminsModalOpen(true);
  };

  const handleCloseManageAdminsModal = () => {
    setIsManageAdminsModalOpen(false);
    setManagingOrg(null);
    setManageError("");
  };

  const handleSetOwner = async (userId: string) => {
    if (!managingOrg) return;
    
    setProcessing(true);
    setManageError("");

    try {
      const response = await fetch("/api/admin/organizations/set-owner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: managingOrg.id,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to set owner");
      }

      showToast(t("organizations.ownerUpdated"), "success");
      await fetchOrganizations();
      
      // Update local state
      const updatedOrg = organizations.find(o => o.id === managingOrg.id);
      if (updatedOrg) {
        setManagingOrg(updatedOrg);
      }
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Failed to set owner");
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    if (!managingOrg) return;
    
    setProcessing(true);
    setManageError("");

    try {
      const response = await fetch("/api/admin/organizations/remove-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: managingOrg.id,
          userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove admin");
      }

      showToast(t("organizations.adminRemoved"), "success");
      await fetchOrganizations();
      
      // Update local state
      const updatedOrg = organizations.find(o => o.id === managingOrg.id);
      if (updatedOrg) {
        setManagingOrg(updatedOrg);
      }
    } catch (err) {
      setManageError(err instanceof Error ? err.message : "Failed to remove admin");
    } finally {
      setProcessing(false);
    }
  };

  // Update managingOrg when organizations change (use managingOrg.id to avoid infinite loop)
  const managingOrgId = managingOrg?.id;
  useEffect(() => {
    if (managingOrgId) {
      const updatedOrg = organizations.find(o => o.id === managingOrgId);
      if (updatedOrg) {
        setManagingOrg(updatedOrg);
      }
    }
  }, [organizations, managingOrgId]);

  if (status === "loading" || loading) {
    return (
      <main className="im-admin-organizations-page">
        <div className="im-admin-organizations-loading">
          <div className="im-admin-organizations-loading-spinner" />
          <span className="im-admin-organizations-loading-text">{t("common.loading")}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="im-admin-organizations-page">
      <PageHeader
        title={t("organizations.title")}
        description={t("organizations.subtitle")}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`im-toast im-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      <section className="rsp-content">
        <Breadcrumbs
          items={[
            { label: t("breadcrumbs.home"), href: "/" },
            { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
            { label: t("organizations.breadcrumb") },
          ]}
          className="mb-6"
          ariaLabel={t("breadcrumbs.navigation")}
        />

        <div className="im-admin-organizations-actions">
          <Button onClick={() => setIsCreateModalOpen(true)}>
            {t("organizations.createOrganization")}
          </Button>
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        {organizations.length === 0 ? (
          <div className="im-admin-organizations-empty">
            <p className="im-admin-organizations-empty-text">
              {t("organizations.noOrganizations")}
            </p>
          </div>
        ) : (
          <div className="im-admin-organizations-table-wrapper">
            <table className="im-admin-organizations-table">
              <thead>
                <tr>
                  <th>{t("organizations.name")}</th>
                  <th>{t("organizations.slug")}</th>
                  <th>{t("organizations.clubs")}</th>
                  <th>{t("organizations.superAdmins")}</th>
                  <th>{t("organizations.createdAt")}</th>
                  <th>{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="im-org-name">{org.name}</td>
                    <td className="im-org-slug">{org.slug}</td>
                    <td className="im-org-clubs">{org.clubCount}</td>
                    <td className="im-org-admin">
                      {org.superAdmins && org.superAdmins.length > 0 ? (
                        <div className="im-org-admins-list">
                          {org.superAdmins.map((admin) => (
                            <span
                              key={admin.id}
                              className={`im-org-admin-badge ${admin.isPrimaryOwner ? "im-org-admin-badge--owner" : ""}`}
                            >
                              {admin.name || admin.email}
                              {admin.isPrimaryOwner && (
                                <span className="im-org-owner-label">{t("organizations.owner")}</span>
                              )}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="im-org-no-admin">
                          {t("organizations.notAssigned")}
                        </span>
                      )}
                    </td>
                    <td className="im-org-date">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="im-org-actions">
                      <div className="im-org-actions-buttons">
                        <Button
                          variant="outline"
                          onClick={() => handleOpenAssignModal(org)}
                        >
                          {t("organizations.addAdmin")}
                        </Button>
                        {org.superAdmins && org.superAdmins.length > 0 && (
                          <Button
                            variant="outline"
                            onClick={() => handleOpenManageAdminsModal(org)}
                          >
                            {t("organizations.manageAdmins")}
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
      </section>

      {/* Create Organization Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t("organizations.createOrganization")}
      >
        <form onSubmit={handleCreateOrganization} className="space-y-4">
          {createError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {createError}
            </div>
          )}
          <Input
            label={t("organizations.orgName")}
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder={t("organizations.orgNamePlaceholder")}
            required
          />
          <Input
            label={t("organizations.orgSlug")}
            value={newOrgSlug}
            onChange={(e) => setNewOrgSlug(e.target.value)}
            placeholder={t("organizations.orgSlugPlaceholder")}
          />
          <p className="im-form-hint">{t("organizations.slugHint")}</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? t("common.processing") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign SuperAdmin Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={handleCloseAssignModal}
        title={t("organizations.addSuperAdmin")}
      >
        <form onSubmit={handleAssignAdmin} className="space-y-4">
          {assignError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {assignError}
            </div>
          )}

          <p className="im-assign-org-name">
            {t("organizations.assigningTo")}: <strong>{selectedOrg?.name}</strong>
          </p>

          <div className="im-assign-mode-tabs">
            <button
              type="button"
              className={`im-assign-mode-tab ${assignMode === "existing" ? "im-assign-mode-tab--active" : ""}`}
              onClick={() => setAssignMode("existing")}
            >
              {t("organizations.existingUser")}
            </button>
            <button
              type="button"
              className={`im-assign-mode-tab ${assignMode === "new" ? "im-assign-mode-tab--active" : ""}`}
              onClick={() => setAssignMode("new")}
            >
              {t("organizations.newUser")}
            </button>
          </div>

          {assignMode === "existing" ? (
            <>
              <Input
                label={t("organizations.searchUsers")}
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t("organizations.searchUsersPlaceholder")}
              />
              <div className="im-user-list">
                {users.length === 0 ? (
                  <p className="im-user-list-empty">{t("organizations.noUsersFound")}</p>
                ) : (
                  users.map((user) => {
                    // Check if user is already an admin of the selected org
                    const isAlreadyAdminOfThisOrg = selectedOrg?.superAdmins?.some(
                      (admin) => admin.id === user.id
                    );
                    
                    return (
                      <label
                        key={user.id}
                        className={`im-user-option ${isAlreadyAdminOfThisOrg ? "im-user-option--disabled" : ""} ${selectedUserId === user.id ? "im-user-option--selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="userId"
                          value={user.id}
                          checked={selectedUserId === user.id}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                          disabled={isAlreadyAdminOfThisOrg}
                        />
                        <span className="im-user-info">
                          <span className="im-user-name">{user.name || user.email}</span>
                          <span className="im-user-email">{user.email}</span>
                          {isAlreadyAdminOfThisOrg && (
                            <span className="im-user-badge">
                              {t("organizations.alreadyAdminOfThisOrg")}
                            </span>
                          )}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <Input
                label={t("common.name")}
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                placeholder={t("auth.enterName")}
                required
              />
              <Input
                label={t("common.email")}
                type="email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                placeholder={t("auth.enterEmail")}
                required
              />
              <Input
                label={t("common.password")}
                type="password"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                placeholder={t("auth.createPassword")}
                required
                showPasswordToggle
              />
            </>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCloseAssignModal}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={
                assigning ||
                (assignMode === "existing" && !selectedUserId) ||
                (assignMode === "new" && (!newAdminName || !newAdminEmail || !newAdminPassword))
              }
            >
              {assigning ? t("common.processing") : t("organizations.addAdmin")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Manage SuperAdmins Modal */}
      <Modal
        isOpen={isManageAdminsModalOpen}
        onClose={handleCloseManageAdminsModal}
        title={t("organizations.manageSuperAdmins")}
      >
        <div className="space-y-4">
          {manageError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {manageError}
            </div>
          )}

          <p className="im-assign-org-name">
            {t("organizations.managingAdminsFor")}: <strong>{managingOrg?.name}</strong>
          </p>

          <div className="im-manage-admins-list">
            {managingOrg?.superAdmins?.map((admin) => (
              <div key={admin.id} className="im-manage-admin-item">
                <div className="im-manage-admin-info">
                  <span className="im-manage-admin-name">{admin.name || admin.email}</span>
                  <span className="im-manage-admin-email">{admin.email}</span>
                  {admin.isPrimaryOwner && (
                    <span className="im-manage-admin-owner-badge">{t("organizations.owner")}</span>
                  )}
                </div>
                <div className="im-manage-admin-actions">
                  {!admin.isPrimaryOwner && (
                    <>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={() => handleSetOwner(admin.id)}
                        disabled={processing}
                      >
                        {t("organizations.setAsOwner")}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => handleRemoveAdmin(admin.id)}
                        disabled={processing}
                      >
                        {t("organizations.remove")}
                      </Button>
                    </>
                  )}
                  {admin.isPrimaryOwner && managingOrg?.superAdmins?.length === 1 && (
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => handleRemoveAdmin(admin.id)}
                      disabled={processing}
                    >
                      {t("organizations.remove")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCloseManageAdminsModal}>
              {t("common.close")}
            </Button>
            <Button onClick={() => {
              handleCloseManageAdminsModal();
              if (managingOrg) handleOpenAssignModal(managingOrg);
            }}>
              {t("organizations.addAdmin")}
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
