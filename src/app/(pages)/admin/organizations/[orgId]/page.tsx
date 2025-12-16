"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, PageHeader, EntityBanner, MetricCardSkeleton, OrgInfoCardSkeleton, ClubsPreviewSkeleton, TableSkeleton, BookingsPreviewSkeleton, IMLink } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import type { AdminBookingResponse } from "@/app/api/admin/bookings/route";

import "./page.css";
import "@/components/ClubDetailPage.css";

// Basic user info interface for this component
// Note: Defined locally to avoid coupling with full User model from Prisma
interface User {
  id: string;
  name: string | null;
  email: string;
}

interface SuperAdmin extends User {
  isPrimaryOwner: boolean;
  membershipId: string;
}

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

interface ClubPreview {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  isPublic: boolean;
  courtCount: number;
  adminCount: number;
  createdAt: string;
}

interface ClubAdmin {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string;
  clubId: string;
  clubName: string;
  createdAt: string;
}

interface BookingPreview {
  id: string;
  courtName: string;
  clubName: string;
  userName: string | null;
  userEmail: string;
  start: string;
  end: string;
  status: string;
  sportType: string;
}

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  superAdmins: SuperAdmin[];
  primaryOwner: SuperAdmin | null;
  metrics: {
    totalClubs: number;
    totalCourts: number;
    activeBookings: number;
    activeUsers: number;
  };
  clubsPreview: ClubPreview[];
  clubAdmins: ClubAdmin[];
}

interface BookingsPreviewData {
  items: BookingPreview[];
  summary: {
    todayCount: number;
    weekCount: number;
    totalUpcoming: number;
  };
}

export default function OrganizationDetailPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;

  // Use Zustand store
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const deleteOrganization = useOrganizationStore((state) => state.deleteOrganization);
  const setCurrentOrg = useOrganizationStore((state) => state.setCurrentOrg);

  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [bookingsPreview, setBookingsPreview] = useState<BookingsPreviewData | null>(null);
  const [orgAdmins, setOrgAdmins] = useState<OrgAdmin[]>([]);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactPhone, setEditContactPhone] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);

  // Reassign owner modal
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<"existing" | "new">("existing");
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [reassignError, setReassignError] = useState("");
  const [reassigning, setReassigning] = useState(false);

  // Archive modal
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState(false);

  // Delete modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmSlug, setDeleteConfirmSlug] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const isRoot = session?.user?.isRoot ?? false;

  const fetchOrgDetail = useCallback(async () => {
    try {
      setLoadingOrg(true);
      // Fetch full org details from API (includes metrics, activity, etc.)
      const response = await fetch(`/api/orgs/${orgId}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          router.push("/auth/sign-in");
          return;
        }
        throw new Error("Failed to fetch organization");
      }
      const data = await response.json();
      setOrg(data);
      setError("");

      // Update the store's currentOrg with the fetched data (avoid redundant API call)
      // Extract Organization-compatible fields from the full org detail response
      const { id, name, slug, createdAt, updatedAt, archivedAt, contactEmail, contactPhone, website, address } = data;
      setCurrentOrg({
        id,
        name,
        slug,
        createdAt,
        updatedAt,
        archivedAt,
        contactEmail,
        contactPhone,
        website,
        address,
      });
    } catch {
      setError(t("orgDetail.failedToLoad"));
    } finally {
      setLoadingOrg(false);
    }
  }, [orgId, router, t, setCurrentOrg]);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoadingAdmins(true);
      const response = await fetch(`/api/orgs/${orgId}/admins`);
      if (response.ok) {
        const data = await response.json();
        setOrgAdmins(data.superAdmins || []);
      }
    } catch {
      // Silent fail - admins section will show empty state
    } finally {
      setLoadingAdmins(false);
    }
  }, [orgId]);

  const fetchBookingsPreview = useCallback(async () => {
    try {
      setLoadingBookings(true);
      // Constants for booking limits
      const MAX_SUMMARY_BOOKINGS = 100;
      const PREVIEW_BOOKINGS_LIMIT = 10;

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get week range
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      // Fetch bookings for the organization
      const [todayResponse, weekResponse, upcomingResponse] = await Promise.all([
        fetch(`/api/admin/bookings?orgId=${orgId}&dateFrom=${today.toISOString()}&dateTo=${tomorrow.toISOString()}&perPage=${MAX_SUMMARY_BOOKINGS}`),
        fetch(`/api/admin/bookings?orgId=${orgId}&dateFrom=${today.toISOString()}&dateTo=${weekFromNow.toISOString()}&perPage=${MAX_SUMMARY_BOOKINGS}`),
        fetch(`/api/admin/bookings?orgId=${orgId}&dateFrom=${today.toISOString()}&perPage=${PREVIEW_BOOKINGS_LIMIT}`)
      ]);

      if (todayResponse.ok && weekResponse.ok && upcomingResponse.ok) {
        const [todayData, weekData, upcomingData] = await Promise.all([
          todayResponse.json(),
          weekResponse.json(),
          upcomingResponse.json()
        ]);

        setBookingsPreview({
          items: upcomingData.bookings.map((b: AdminBookingResponse) => ({
            id: b.id,
            courtName: b.courtName,
            clubName: b.clubName,
            userName: b.userName,
            userEmail: b.userEmail,
            start: b.start,
            end: b.end,
            status: b.status,
            sportType: b.sportType,
          })),
          summary: {
            todayCount: todayData.total,
            weekCount: weekData.total,
            totalUpcoming: upcomingData.total,
          },
        });
      }
    } catch {
      // Silent fail
    } finally {
      setLoadingBookings(false);
    }
  }, [orgId]);

  const fetchUsers = useCallback(async (query: string = "") => {
    try {
      await fetchSimpleUsers(query);
    } catch {
      // Silent fail for user search
    }
  }, [fetchSimpleUsers]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }
    fetchOrgDetail();
    fetchAdmins();
    fetchBookingsPreview();
  }, [session, status, router, fetchOrgDetail, fetchAdmins, fetchBookingsPreview]);

  // Debounced user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isReassignModalOpen && reassignMode === "existing") {
        fetchUsers(userSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, isReassignModalOpen, reassignMode, fetchUsers]);

  // Edit handlers
  const handleOpenEditModal = () => {
    if (!org) return;
    setEditName(org.name);
    setEditSlug(org.slug);
    setEditContactEmail(org.contactEmail || "");
    setEditContactPhone(org.contactPhone || "");
    setEditWebsite(org.website || "");
    setEditAddress(org.address || "");
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleEditOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    setEditing(true);

    try {
      await updateOrganization(orgId, {
        name: editName,
        slug: editSlug,
        contactEmail: editContactEmail,
        contactPhone: editContactPhone,
        website: editWebsite,
        address: editAddress,
      });

      showToast(t("orgDetail.updateSuccess"), "success");
      setIsEditModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update organization");
    } finally {
      setEditing(false);
    }
  };

  // Reassign owner handlers
  const handleOpenReassignModal = () => {
    setReassignMode("existing");
    setUserSearch("");
    setSelectedUserId("");
    setNewOwnerName("");
    setNewOwnerEmail("");
    setReassignError("");
    setIsReassignModalOpen(true);
    fetchUsers();
  };

  const handleReassignOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    setReassignError("");
    setReassigning(true);

    try {
      const payload =
        reassignMode === "new"
          ? { email: newOwnerEmail, name: newOwnerName }
          : { userId: selectedUserId };

      const response = await fetch(`/api/orgs/${orgId}/reassign-superadmin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to reassign owner");
      }

      showToast(t("orgDetail.ownerReassigned"), "success");
      setIsReassignModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : "Failed to reassign owner");
    } finally {
      setReassigning(false);
    }
  };

  // Archive handlers
  const handleArchive = async () => {
    setArchiveError("");
    setArchiving(true);

    try {
      const response = await fetch(`/api/orgs/${orgId}/archive`, {
        method: "POST",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to archive organization");
      }

      showToast(t("orgDetail.archiveSuccess"), "success");
      setIsArchiveModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : "Failed to archive organization");
    } finally {
      setArchiving(false);
    }
  };

  // Delete handlers
  const handleDelete = async () => {
    if (!org || deleteConfirmSlug.toLowerCase() !== org.slug.toLowerCase()) {
      setDeleteError(t("orgDetail.slugMismatch"));
      return;
    }

    setDeleteError("");
    setDeleting(true);

    try {
      await deleteOrganization(orgId, org.slug);

      showToast(t("orgDetail.deleteSuccess"), "success");
      router.push("/admin/organizations");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete organization");
    } finally {
      setDeleting(false);
    }
  };



  // Show loading spinner while checking authentication
  const isLoadingState = status === "loading" || loadingOrg;

  return (
    <main className="im-org-detail-page">
      {/* Organization Banner */}
      {isLoadingState ? (
        <div className="im-section-card">
          <div className="im-skeleton h-32 w-full rounded-lg" />
        </div>
      ) : error && !org ? (
        <div className="im-org-detail-error">
          <p>{error || t("orgDetail.notFound")}</p>
          <Button onClick={() => router.push("/admin/organizations")}>
            {t("common.backToDashboard")}
          </Button>
        </div>
      ) : org && (
        <EntityBanner
          title={org.name}
          subtitle={org.address || (org.website ? `${t("orgDetail.website")}: ${org.website}` : null)}
          location={org.address}
          imageUrl={null}
          logoUrl={null}
          imageAlt={`${org.name} banner`}
          logoAlt={`${org.name} logo`}
        />
      )}

      <div className="rsp-club-content">
        {loadingOrg ? (
          <div className="im-page-header-skeleton mb-8">
            <div className="im-skeleton h-8 w-64 rounded mb-3" />
            <div className="im-skeleton h-5 w-96 rounded" />
          </div>
        ) : org && (
          <PageHeader
            title={org.name}
            description={
              org.archivedAt
                ? t("orgDetail.archived")
                : org.primaryOwner
                  ? `${t("orgDetail.slug")}: ${org.slug} | ${t("orgDetail.superAdmin")}: ${org.primaryOwner.name || org.primaryOwner.email}`
                  : org.slug
            }
            actions={
              <div className="im-org-detail-header-actions">
                <Button variant="outline" onClick={handleOpenEditModal} disabled={!!org.archivedAt}>
                  {t("common.edit")}
                </Button>
                {isRoot && (
                  <>
                    <Button variant="outline" onClick={handleOpenReassignModal} disabled={!!org.archivedAt}>
                      {t("orgDetail.reassignOwner")}
                    </Button>
                    {!org.archivedAt && (
                      <Button variant="outline" onClick={() => setIsArchiveModalOpen(true)}>
                        {t("orgDetail.archive")}
                      </Button>
                    )}
                    <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                      {t("common.delete")}
                    </Button>
                  </>
                )}
              </div>
            }
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
        )}

        <section className="im-org-detail-content">
          {/* Organization Info Card */}
          {loadingOrg ? (
            <OrgInfoCardSkeleton items={6} className="im-org-detail-content--full" />
          ) : org && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.info")}</h2>
              </div>
              <div className="im-org-info-grid">
                <div className="im-org-info-item">
                  <span className="im-org-info-label">{t("orgDetail.slug")}</span>
                  <span className="im-org-info-value">{org.slug}</span>
                </div>
                <div className="im-org-info-item">
                  <span className="im-org-info-label">{t("orgDetail.createdBy")}</span>
                  <span className="im-org-info-value">
                    {org.createdBy.name || org.createdBy.email}
                  </span>
                </div>
                <div className="im-org-info-item">
                  <span className="im-org-info-label">{t("orgDetail.createdAt")}</span>
                  <span className="im-org-info-value">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="im-org-info-item">
                  <span className="im-org-info-label">{t("orgDetail.lastUpdated")}</span>
                  <span className="im-org-info-value">
                    {new Date(org.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {org.contactEmail && (
                  <div className="im-org-info-item">
                    <span className="im-org-info-label">{t("common.email")}</span>
                    <span className="im-org-info-value">{org.contactEmail}</span>
                  </div>
                )}
                {org.contactPhone && (
                  <div className="im-org-info-item">
                    <span className="im-org-info-label">{t("orgDetail.phone")}</span>
                    <span className="im-org-info-value">{org.contactPhone}</span>
                  </div>
                )}
                {org.website && (
                  <div className="im-org-info-item">
                    <span className="im-org-info-label">{t("orgDetail.website")}</span>
                    <span className="im-org-info-value">
                      <a href={org.website} target="_blank" rel="noopener noreferrer">
                        {org.website}
                      </a>
                    </span>
                  </div>
                )}
                {org.address && (
                  <div className="im-org-info-item im-org-info-item--full">
                    <span className="im-org-info-label">{t("common.address")}</span>
                    <span className="im-org-info-value">{org.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          {loadingOrg ? (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
                <div className="im-skeleton h-6 w-48 rounded" />
              </div>
              <div className="im-metrics-grid">
                <MetricCardSkeleton size="md" />
                <MetricCardSkeleton size="md" />
                <MetricCardSkeleton size="md" />
                <MetricCardSkeleton size="md" />
              </div>
            </div>
          ) : org && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--metrics">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                    <path d="M22 12A10 10 0 0 0 12 2v10z" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.keyMetrics")}</h2>
              </div>
              <div className="im-metrics-grid">
                <div className="im-metric-card im-metric-card--clubs">
                  <div className="im-metric-value">{org.metrics.totalClubs}</div>
                  <div className="im-metric-label">{t("orgDetail.totalClubs")}</div>
                </div>
                <div className="im-metric-card im-metric-card--courts">
                  <div className="im-metric-value">{org.metrics.totalCourts}</div>
                  <div className="im-metric-label">{t("orgDetail.totalCourts")}</div>
                </div>
                <div className="im-metric-card im-metric-card--bookings">
                  <div className="im-metric-value">{org.metrics.activeBookings}</div>
                  <div className="im-metric-label">{t("orgDetail.activeBookings")}</div>
                </div>
                <div className="im-metric-card im-metric-card--users">
                  <div className="im-metric-value">{org.metrics.activeUsers}</div>
                  <div className="im-metric-label">{t("orgDetail.activeUsers")}</div>
                </div>
              </div>
            </div>
          )}

          {/* Clubs Preview */}
          {loadingOrg ? (
            <ClubsPreviewSkeleton count={3} />
          ) : org && (
            <div className="im-section-card">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--clubs">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.clubs")}</h2>
              </div>
              {org.clubsPreview.length === 0 ? (
                <p className="im-preview-empty">{t("orgDetail.noClubs")}</p>
              ) : (
                <>
                  <div className="im-clubs-preview-list">
                    {org.clubsPreview.map((club) => (
                      <div key={club.id} className="im-club-preview-item">
                        <div className="im-club-preview-info">
                          <span className="im-club-preview-name">{club.name}</span>
                          <span className="im-club-preview-meta">
                            {club.city || club.slug} · {club.courtCount} {t("orgDetail.courts")}
                          </span>
                        </div>
                        <div className="im-club-preview-status">
                          <span
                            className={`im-status-badge ${club.isPublic ? "im-status-badge--active" : "im-status-badge--draft"}`}
                          >
                            {club.isPublic ? t("common.published") : t("common.draft")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {org.metrics.totalClubs > org.clubsPreview.length && (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => router.push(`/admin/organizations/${orgId}/clubs`)}
                      className="im-view-all-btn"
                    >
                      {t("orgDetail.viewAllClubs")} ({org.metrics.totalClubs})
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Organization Admins Management */}
          {loadingAdmins ? (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-skeleton im-skeleton-icon--round w-10 h-10" />
                <div className="im-skeleton h-6 w-48 rounded" />
              </div>
              <TableSkeleton rows={3} columns={4} showHeader={true} />
            </div>
          ) : (
            <div className="im-section-card im-org-detail-content--full">
              <OrganizationAdminsTable
                orgId={orgId}
                admins={orgAdmins}
                onRefresh={fetchAdmins}
              />
            </div>
          )}

          {/* Bookings Summary */}
          {loadingBookings ? (
            <BookingsPreviewSkeleton count={5} className="im-org-detail-content--full" />
          ) : bookingsPreview && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--bookings">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.bookingsOverview")}</h2>
                <div className="im-section-actions">
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => router.push(`/admin/bookings?orgId=${orgId}`)}
                  >
                    {t("orgDetail.viewAllBookings")}
                  </Button>
                </div>
              </div>
              <div className="im-bookings-summary">
                <div className="im-bookings-summary-item">
                  <span className="im-bookings-summary-value">{bookingsPreview.summary.todayCount}</span>
                  <span className="im-bookings-summary-label">{t("orgDetail.bookingsToday")}</span>
                </div>
                <div className="im-bookings-summary-item">
                  <span className="im-bookings-summary-value">{bookingsPreview.summary.weekCount}</span>
                  <span className="im-bookings-summary-label">{t("orgDetail.bookingsThisWeek")}</span>
                </div>
                <div className="im-bookings-summary-item">
                  <span className="im-bookings-summary-value">{bookingsPreview.summary.totalUpcoming}</span>
                  <span className="im-bookings-summary-label">{t("orgDetail.totalUpcoming")}</span>
                </div>
              </div>
              {bookingsPreview.items.length === 0 ? (
                <p className="im-preview-empty">{t("orgDetail.noBookings")}</p>
              ) : (
                <div className="im-bookings-preview-list">
                  <h4 className="im-bookings-preview-title">{t("orgDetail.upcomingBookings")}</h4>
                  {bookingsPreview.items.map((booking) => {
                    const startDate = new Date(booking.start);
                    const endDate = new Date(booking.end);

                    return (
                      <div key={booking.id} className="im-booking-preview-item">
                        <div className="im-booking-preview-info">
                          <span className="im-booking-preview-court">{booking.clubName} - {booking.courtName}</span>
                          <span className="im-booking-preview-meta">
                            {booking.userName || booking.userEmail} · {booking.sportType}
                          </span>
                        </div>
                        <div className="im-booking-preview-time">
                          <span className="im-booking-preview-date">
                            {startDate.toLocaleDateString()}
                          </span>
                          <span className="im-booking-preview-hours">
                            {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <span className={`im-status-badge im-status-badge--${booking.status.toLowerCase()}`}>
                          {booking.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Danger Zone */}
          {isRoot && !loadingOrg && org && (
            <div className="im-section-card im-danger-zone-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--danger">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.dangerZone")}</h2>
              </div>
              <div className="im-danger-zone-content">
                <div className="im-danger-action">
                  <div>
                    <h4>{t("orgDetail.archiveOrg")}</h4>
                    <p>{t("orgDetail.archiveDescription")}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setIsArchiveModalOpen(true)}
                    disabled={!!org.archivedAt}
                  >
                    {org.archivedAt ? t("orgDetail.alreadyArchived") : t("orgDetail.archive")}
                  </Button>
                </div>
                <div className="im-danger-action im-danger-action--delete">
                  <div>
                    <h4>{t("orgDetail.deleteOrg")}</h4>
                    <p>{t("orgDetail.deleteDescription")}</p>
                  </div>
                  <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={t("orgDetail.editOrg")}
        >
          <form onSubmit={handleEditOrg} className="space-y-4">
            {editError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {editError}
              </div>
            )}
            <Input
              label={t("organizations.orgName")}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label={t("organizations.orgSlug")}
              value={editSlug}
              onChange={(e) => setEditSlug(e.target.value)}
            />
            <Input
              label={t("common.email")}
              type="email"
              value={editContactEmail}
              onChange={(e) => setEditContactEmail(e.target.value)}
            />
            <Input
              label={t("orgDetail.phone")}
              value={editContactPhone}
              onChange={(e) => setEditContactPhone(e.target.value)}
            />
            <Input
              label={t("orgDetail.website")}
              value={editWebsite}
              onChange={(e) => setEditWebsite(e.target.value)}
            />
            <Input
              label={t("common.address")}
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={editing}>
                {editing ? t("common.processing") : t("common.save")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Reassign Owner Modal */}
        <Modal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          title={t("orgDetail.reassignOwner")}
        >
          <form onSubmit={handleReassignOwner} className="space-y-4">
            {reassignError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {reassignError}
              </div>
            )}

            <p className="im-reassign-warning">{t("orgDetail.reassignWarning")}</p>

            <div className="im-assign-mode-tabs">
              <button
                type="button"
                className={`im-assign-mode-tab ${reassignMode === "existing" ? "im-assign-mode-tab--active" : ""}`}
                onClick={() => setReassignMode("existing")}
              >
                {t("organizations.existingUser")}
              </button>
              <button
                type="button"
                className={`im-assign-mode-tab ${reassignMode === "new" ? "im-assign-mode-tab--active" : ""}`}
                onClick={() => setReassignMode("new")}
              >
                {t("organizations.newUser")}
              </button>
            </div>

            {reassignMode === "existing" ? (
              <>
                <Input
                  label={t("organizations.searchUsers")}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={t("organizations.searchUsersPlaceholder")}
                />
                <div className="im-user-list">
                  {simpleUsers.length === 0 ? (
                    <p className="im-user-list-empty">{t("organizations.noUsersFound")}</p>
                  ) : (
                    simpleUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`im-user-option ${selectedUserId === user.id ? "im-user-option--selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="userId"
                          value={user.id}
                          checked={selectedUserId === user.id}
                          onChange={(e) => setSelectedUserId(e.target.value)}
                        />
                        <span className="im-user-info">
                          <span className="im-user-name">{user.name || user.email}</span>
                          <span className="im-user-email">{user.email}</span>
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
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  required
                />
                <Input
                  label={t("common.email")}
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  required
                />
              </>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsReassignModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  reassigning ||
                  (reassignMode === "existing" && !selectedUserId) ||
                  (reassignMode === "new" && (!newOwnerName || !newOwnerEmail))
                }
              >
                {reassigning ? t("common.processing") : t("orgDetail.reassign")}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Archive Modal */}
        {/* <Modal
          isOpen={isArchiveModalOpen}
          onClose={() => setIsArchiveModalOpen(false)}
          title={t("orgDetail.archiveOrg")}
        >
          <div className="space-y-4">
            {archiveError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {archiveError}
              </div>
            )}
            <p>{t("orgDetail.archiveConfirm", { name: org.name })}</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsArchiveModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button variant="danger" onClick={handleArchive} disabled={archiving}>
                {archiving ? t("common.processing") : t("orgDetail.archive")}
              </Button>
            </div>
          </div>
        </Modal> */}

        {/* Delete Modal */}
        {/* <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={t("orgDetail.deleteOrg")}
        >
          <div className="space-y-4">
            {deleteError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {deleteError}
              </div>
            )}
            <p className="im-delete-warning">{t("orgDetail.deleteConfirm", { name: org.name })}</p>
            {org.metrics.totalClubs > 0 && (
              <div className="rsp-warning bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-400 px-4 py-3 rounded-sm">
                {t("orgDetail.deleteWithClubsWarning", { count: org.metrics.totalClubs })}
              </div>
            )}
            <p className="im-delete-confirm-hint">{t("orgDetail.typeSlugToConfirm")}</p>
            <Input
              label={t("orgDetail.confirmSlug")}
              value={deleteConfirmSlug}
              onChange={(e) => setDeleteConfirmSlug(e.target.value)}
              placeholder={org.slug}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmSlug.toLowerCase() !== org.slug.toLowerCase()}
              >
                {deleting ? t("common.processing") : t("common.delete")}
              </Button>
            </div>
          </div>
        </Modal> */}
      </div>
    </main>
  );
}
