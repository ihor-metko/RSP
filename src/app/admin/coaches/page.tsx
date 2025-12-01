"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Modal, Select, Multiselect, IMLink } from "@/components/ui";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { DashboardFooter } from "@/components/layout";
import type { Club } from "@/types/club";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface CoachFormData {
  name: string;
  email: string;
  password: string;
  clubIds: string[];
}

const initialFormData: CoachFormData = {
  name: "",
  email: "",
  password: "",
  clubIds: [],
};

export default function AdminCoachesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [targetRole, setTargetRole] = useState<"coach" | "player">("coach");
  const [selectedClubIds, setSelectedClubIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<CoachFormData>(initialFormData);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchClubs = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/clubs");
      if (response.ok) {
        const data = await response.json();
        setClubs(data);
      }
    } catch (err) {
      // Log error for debugging but don't block the UI
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load clubs:", err);
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter) params.set("role", roleFilter);
      
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
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [router, searchQuery, roleFilter]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/sign-in");
      return;
    }

    fetchUsers();
    fetchClubs();
  }, [session, status, router, fetchUsers, fetchClubs]);

  const handleOpenCreateModal = () => {
    setFormData(initialFormData);
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setFormData(initialFormData);
    setFormError("");
  };

  const handleOpenRoleModal = (user: User, role: "coach" | "player") => {
    setSelectedUser(user);
    setTargetRole(role);
    setSelectedClubIds([]);
    setFormError("");
    setIsRoleModalOpen(true);
  };

  const handleCloseRoleModal = () => {
    setIsRoleModalOpen(false);
    setSelectedUser(null);
    setSelectedClubIds([]);
    setFormError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClubSelectChange = (values: string[]) => {
    setFormData((prev) => ({ ...prev, clubIds: values }));
  };

  const handleRoleModalClubSelectChange = (values: string[]) => {
    setSelectedClubIds(values);
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    // Validate club selection
    if (formData.clubIds.length === 0) {
      setFormError("Please select at least one club");
      return;
    }

    setSubmitting(true);

    try {
      // First create the user
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create coach");
      }

      const newUser = await response.json();

      // Then update their role with club assignment
      const roleResponse = await fetch(`/api/admin/users/${newUser.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "coach",
          clubIds: formData.clubIds,
        }),
      });

      if (!roleResponse.ok) {
        const data = await roleResponse.json();
        throw new Error(data.error || "Failed to assign coach to club");
      }

      handleCloseCreateModal();
      fetchUsers();
      showToast("Trainer role assigned and linked to club(s) successfully.", "success");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create coach");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    // Validate club selection when assigning coach role
    if (targetRole === "coach" && selectedClubIds.length === 0) {
      setFormError("Please select at least one club");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: targetRole,
          clubIds: targetRole === "coach" ? selectedClubIds : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update role");
      }

      handleCloseRoleModal();
      fetchUsers();
      showToast(
        targetRole === "coach" 
          ? "Trainer role assigned and linked to club(s) successfully." 
          : "Coach role removed successfully",
        "success"
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update role";
      setFormError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "coach":
        return "bg-blue-500";
      case "player":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const clubOptions = clubs.map((club) => ({
    value: club.id,
    label: club.name,
  }));

  if (status === "loading" || loading) {
    return (
      <main className="rsp-container min-h-screen p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  return (
    <main className="rsp-container min-h-screen p-8">
      <header className="rsp-header flex items-center justify-between mb-8">
        <div>
          <h1 className="rsp-title text-3xl font-bold">Admin - Coaches</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            Manage coaches and user roles
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <UserRoleIndicator />
        </div>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg ${
            toast.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400"
          }`}
        >
          {toast.message}
        </div>
      )}

      <section className="rsp-content">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <IMLink href="/">
            ← Back to Home
          </IMLink>
          <Button onClick={handleOpenCreateModal}>Create New Coach</Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Select
              options={[
                { value: "", label: "All Roles" },
                { value: "player", label: "Player" },
                { value: "coach", label: "Coach" },
                { value: "admin", label: "Admin" },
              ]}
              value={roleFilter}
              onChange={(value) => setRoleFilter(value)}
              aria-label="Filter by role"
              className="w-full md:w-auto"
            />
          </div>
        </div>

        {error && (
          <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
            {error}
          </div>
        )}

        <Card>
          <div className="rsp-users-table overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--rsp-border)" }}>
                  <th className="py-3 px-4 font-semibold">Name</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Role</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      style={{ borderColor: "var(--rsp-border)" }}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium">{user.name || "-"}</span>
                      </td>
                      <td className="py-3 px-4">{user.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`${getRoleBadgeClass(user.role)} text-white text-xs px-2 py-1 rounded-full font-medium capitalize`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          {user.role === "player" && (
                            <Button
                              variant="outline"
                              onClick={() => handleOpenRoleModal(user, "coach")}
                            >
                              Assign as Coach
                            </Button>
                          )}
                          {user.role === "coach" && (
                            <Button
                              variant="outline"
                              onClick={() => handleOpenRoleModal(user, "player")}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove Coach
                            </Button>
                          )}
                          {user.role === "admin" && (
                            <span className="text-gray-400 text-sm">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Create Coach Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Create New Coach"
      >
        <form onSubmit={handleCreateCoach} className="space-y-4">
          {formError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {formError}
            </div>
          )}
          <Input
            label="Name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Coach name"
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="coach@example.com"
            required
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Temporary password"
            required
          />
          <Multiselect
            label="Assign to Club(s) *"
            options={clubOptions}
            value={formData.clubIds}
            onChange={handleClubSelectChange}
          />
          {clubs.length === 0 && (
            <p className="text-sm text-gray-500">
              No clubs available. Please create a club first.
            </p>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={handleCloseCreateModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || clubs.length === 0}>
              {submitting ? "Creating..." : "Create Coach"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Role Change Confirmation Modal */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={handleCloseRoleModal}
        title={targetRole === "coach" ? "Assign as Coach" : "Remove Coach Role"}
      >
        <div className="space-y-4">
          {formError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {formError}
            </div>
          )}
          <p>
            {targetRole === "coach" ? (
              <>
                Are you sure you want to assign{" "}
                <strong>{selectedUser?.name || selectedUser?.email}</strong> as a coach?
              </>
            ) : (
              <>
                Are you sure you want to remove coach role from{" "}
                <strong>{selectedUser?.name || selectedUser?.email}</strong>? They will
                become a regular player.
              </>
            )}
          </p>
          
          {targetRole === "coach" && (
            <>
              <Multiselect
                label="Assign to Club(s) *"
                options={clubOptions}
                value={selectedClubIds}
                onChange={handleRoleModalClubSelectChange}
              />
              {clubs.length === 0 && (
                <p className="text-sm text-gray-500">
                  No clubs available. Please create a club first.
                </p>
              )}
            </>
          )}
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCloseRoleModal}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={submitting || (targetRole === "coach" && clubs.length === 0)}
              className={targetRole === "player" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              {submitting
                ? "Processing..."
                : targetRole === "coach"
                ? "Assign as Coach"
                : "Remove Coach"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dashboard Footer */}
      <DashboardFooter />
    </main>
  );
}
