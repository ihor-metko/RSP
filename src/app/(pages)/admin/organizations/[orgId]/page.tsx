"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, EntityBanner, MetricCardSkeleton, OrgInfoCardSkeleton, ClubsPreviewSkeleton, TableSkeleton, BookingsPreviewSkeleton } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import { BasicInfoStep, AddressStep, ContactsStep } from "@/components/admin/OrganizationSteps";
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
  description?: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  address: string | null;
  logo: string | null;
  heroImage: string | null;
  metadata?: Record<string, unknown> | null;
  isPublic: boolean;
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

  // Stepper modal states for editing
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [editError, setEditError] = useState("");
  const [editing, setEditing] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Form data for each section
  const [basicInfoData, setBasicInfoData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const [addressData, setAddressData] = useState({
    country: "",
    city: "",
    postalCode: "",
    street: "",
    latitude: "",
    longitude: "",
  });

  const [contactsData, setContactsData] = useState({
    contactEmail: "",
    contactPhone: "",
    website: "",
    facebook: "",
    instagram: "",
    linkedin: "",
  });

  // Change owner modal
  const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [changeOwnerError, setChangeOwnerError] = useState("");
  const [changingOwner, setChangingOwner] = useState(false);

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
        throw new Error(t("organizations.errors.fetchFailed"));
      }
      const data = await response.json();
      setOrg(data);
      setError("");

      // Update the store's currentOrg with the fetched data (avoid redundant API call)
      // Extract Organization-compatible fields from the full org detail response
      const { id, name, slug, createdAt, updatedAt, archivedAt, contactEmail, contactPhone, website, address, isPublic } = data;
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
        isPublic,
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
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (isReassignModalOpen && reassignMode === "existing") {
  //       fetchUsers(userSearch);
  //     }
  //   }, 300);
  //   return () => clearTimeout(timer);
  // }, [userSearch, isReassignModalOpen, reassignMode, fetchUsers]);

  // Handler for opening edit modals
  const handleOpenBasicInfoEdit = () => {
    if (!org) return;
    setBasicInfoData({
      name: org.name,
      slug: org.slug,
      description: org.description || "",
    });
    setFieldErrors({});
    setEditError("");
    setIsEditingBasicInfo(true);
  };

  const handleOpenAddressEdit = () => {
    if (!org) return;
    const metadata = org.metadata as { country?: string; street?: string; latitude?: number; longitude?: number } | null;

    // Parse address to extract components
    const addressParts = org.address?.split(", ") || [];
    const street = metadata?.street || addressParts[0] || "";
    const city = addressParts.length > 1 ? addressParts[1] : "";
    const postalCode = addressParts.length > 2 ? addressParts[2] : "";
    const country = metadata?.country || (addressParts.length > 3 ? addressParts[3] : "");

    setAddressData({
      country,
      city,
      postalCode,
      street,
      latitude: metadata?.latitude?.toString() || "",
      longitude: metadata?.longitude?.toString() || "",
    });
    setFieldErrors({});
    setEditError("");
    setIsEditingAddress(true);
  };

  const handleOpenContactsEdit = () => {
    if (!org) return;
    const metadata = org.metadata as { socialLinks?: { facebook?: string; instagram?: string; linkedin?: string } } | null;
    const socialLinks = metadata?.socialLinks || {};

    setContactsData({
      contactEmail: org.contactEmail || "",
      contactPhone: org.contactPhone || "",
      website: org.website || "",
      facebook: socialLinks.facebook || "",
      instagram: socialLinks.instagram || "",
      linkedin: socialLinks.linkedin || "",
    });
    setFieldErrors({});
    setEditError("");
    setIsEditingContacts(true);
  };

  // Handle form field changes
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBasicInfoData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddressData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleContactsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setContactsData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Save handlers for each section
  const handleSaveBasicInfo = async () => {
    setEditError("");
    setEditing(true);

    try {
      const payload: Record<string, unknown> = {
        name: basicInfoData.name,
        slug: basicInfoData.slug,
      };

      // Add description if the org has a description field (checking if it's directly available)
      if (basicInfoData.description !== undefined) {
        (payload as { description?: string }).description = basicInfoData.description;
      }

      await updateOrganization(orgId, payload);

      showToast(t("orgDetail.updateSuccess"), "success");
      setIsEditingBasicInfo(false);
      fetchOrgDetail();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("organizations.errors.updateFailed"));
    } finally {
      setEditing(false);
    }
  };

  const handleSaveAddress = async () => {
    setEditError("");
    setEditing(true);

    try {
      // Build full address from components
      const addressParts = [
        addressData.street.trim(),
        addressData.city.trim(),
        addressData.postalCode.trim(),
        addressData.country.trim()
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      await updateOrganization(orgId, {
        address: fullAddress,
        metadata: {
          ...(org?.metadata as object || {}),
          country: addressData.country.trim(),
          street: addressData.street.trim(),
          latitude: parseFloat(addressData.latitude),
          longitude: parseFloat(addressData.longitude),
        },
      });

      showToast(t("orgDetail.updateSuccess"), "success");
      setIsEditingAddress(false);
      fetchOrgDetail();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("organizations.errors.updateFailed"));
    } finally {
      setEditing(false);
    }
  };

  const handleSaveContacts = async () => {
    setEditError("");
    setEditing(true);

    try {
      const socialLinks: Record<string, string> = {};
      if (contactsData.facebook.trim()) socialLinks.facebook = contactsData.facebook.trim();
      if (contactsData.instagram.trim()) socialLinks.instagram = contactsData.instagram.trim();
      if (contactsData.linkedin.trim()) socialLinks.linkedin = contactsData.linkedin.trim();

      await updateOrganization(orgId, {
        contactEmail: contactsData.contactEmail.trim() || null,
        contactPhone: contactsData.contactPhone.trim() || null,
        website: contactsData.website.trim() || null,
        metadata: {
          ...(org?.metadata as object || {}),
          socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        },
      });

      showToast(t("orgDetail.updateSuccess"), "success");
      setIsEditingContacts(false);
      fetchOrgDetail();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("organizations.errors.updateFailed"));
    } finally {
      setEditing(false);
    }
  };

  // Change owner handlers
  const handleOpenChangeOwnerModal = () => {
    setUserSearch("");
    setSelectedUserId("");
    setChangeOwnerError("");
    setIsChangeOwnerModalOpen(true);
    fetchUsers();
  };

  const handleChangeOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setChangeOwnerError(t("organizations.errors.userRequired"));
      return;
    }

    setChangeOwnerError("");
    setChangingOwner(true);

    try {
      const response = await fetch(`/api/admin/organizations/set-owner`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: orgId,
          userId: selectedUserId
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || t("organizations.errors.changeOwnerFailed"));
      }

      showToast(t("orgDetail.ownerChanged"), "success");
      setIsChangeOwnerModalOpen(false);
      fetchOrgDetail();
      fetchAdmins();
    } catch (err) {
      setChangeOwnerError(err instanceof Error ? err.message : t("organizations.errors.changeOwnerFailed"));
    } finally {
      setChangingOwner(false);
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
        throw new Error(data.error || t("organizations.errors.archiveFailed"));
      }

      showToast(t("orgDetail.archiveSuccess"), "success");
      setIsArchiveModalOpen(false);
      fetchOrgDetail();
    } catch (err) {
      setArchiveError(err instanceof Error ? err.message : t("organizations.errors.archiveFailed"));
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
      setDeleteError(err instanceof Error ? err.message : t("organizations.errors.deleteFailed"));
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
          status={
            org.archivedAt
              ? { label: t("common.archived"), variant: 'archived' }
              : (org.isPublic ?? true)
                ? { label: t("common.published"), variant: 'published' }
                : { label: t("common.unpublished"), variant: 'draft' }
          }
        />
      )}

      <div className="rsp-club-content">
        {/* Toast */}
        {toast && (
          <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
        )}

        <section className="im-org-detail-content">
          {/* Organization Overview Block */}
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
                <h2 className="im-section-title">{t("orgDetail.overview")}</h2>
              </div>
              <div className="im-org-overview-block">
                {org.logo && (
                  <div className="im-org-logo">
                    <img src={org.logo} alt={`${org.name} logo`} />
                  </div>
                )}
                <div className="im-org-overview-content">
                  <h3 className="im-org-overview-name">{org.name}</h3>
                  {org.description && (
                    <p className="im-org-overview-description">{org.description}</p>
                  )}
                  <div className="im-org-overview-meta">
                    {org.address && (
                      <div className="im-org-overview-meta-item">
                        <svg className="im-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{org.address}</span>
                      </div>
                    )}
                    <div className="im-org-overview-meta-item">
                      <svg className="im-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{t("orgDetail.createdAt")}: {new Date(org.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="im-org-overview-meta-item">
                      <svg className="im-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      <span>{t("orgDetail.status")}: {org.archivedAt ? t("common.inactive") : t("common.active")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Organization Owner Section */}
          {loadingOrg ? (
            <OrgInfoCardSkeleton items={3} className="im-org-detail-content--full" />
          ) : org && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--owner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.organizationOwner")}</h2>
                {!org.archivedAt && (
                  <div className="im-section-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleOpenChangeOwnerModal}
                    >
                      {org.primaryOwner ? t("orgDetail.changeOwner") : t("orgDetail.assignOwner")}
                    </Button>
                  </div>
                )}
              </div>
              {org.primaryOwner ? (
                <div className="im-owner-info">
                  <div className="im-owner-avatar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <div className="im-owner-details">
                    <h4 className="im-owner-name">{org.primaryOwner.name || t("orgDetail.noName")}</h4>
                    <p className="im-owner-email">{org.primaryOwner.email}</p>
                    <span className="im-owner-role-badge">{t("orgDetail.organizationOwner")}</span>
                  </div>
                </div>
              ) : (
                <div className="im-owner-empty-state">
                  <svg className="im-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <p>{t("orgDetail.noOwnerAssigned")}</p>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={handleOpenChangeOwnerModal}
                    disabled={!!org.archivedAt}
                  >
                    {t("orgDetail.assignOwner")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Basic Information Block */}
          {loadingOrg ? (
            <OrgInfoCardSkeleton items={4} className="im-org-detail-content--full" />
          ) : org && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.basicInformation")}</h2>
                {!org.archivedAt && (
                  <div className="im-section-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleOpenBasicInfoEdit}
                    >
                      {t("common.edit")}
                    </Button>
                  </div>
                )}
              </div>
              <div className="im-org-info-grid">
                <div className="im-org-info-item">
                  <span className="im-org-info-label">{t("orgDetail.name")}</span>
                  <span className="im-org-info-value">{org.name}</span>
                </div>
                <div className="im-org-info-item">
                  <span className="im-org-info-label">{t("orgDetail.slug")}</span>
                  <span className="im-org-info-value">{org.slug}</span>
                </div>
                <div className="im-org-info-item im-org-info-item--full">
                  <span className="im-org-info-label">{t("orgDetail.description")}</span>
                  <span className="im-org-info-value">{org.description || t("orgDetail.noDescription")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Address Block */}
          {loadingOrg ? (
            <OrgInfoCardSkeleton items={3} className="im-org-detail-content--full" />
          ) : org && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--location">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.address")}</h2>
                {!org.archivedAt && (
                  <div className="im-section-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleOpenAddressEdit}
                    >
                      {t("common.edit")}
                    </Button>
                  </div>
                )}
              </div>
              <div className="im-org-info-grid">
                <div className="im-org-info-item im-org-info-item--full">
                  <span className="im-org-info-label">{t("common.address")}</span>
                  <span className="im-org-info-value">{org.address || t("orgDetail.noAddress")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Contacts & Social Links Block */}
          {loadingOrg ? (
            <OrgInfoCardSkeleton items={5} className="im-org-detail-content--full" />
          ) : org && (
            <div className="im-section-card im-org-detail-content--full">
              <div className="im-section-header">
                <div className="im-section-icon im-section-icon--contact">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                </div>
                <h2 className="im-section-title">{t("orgDetail.contactsAndSocial")}</h2>
                {!org.archivedAt && (
                  <div className="im-section-actions">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={handleOpenContactsEdit}
                    >
                      {t("common.edit")}
                    </Button>
                  </div>
                )}
              </div>
              <div className="im-org-info-grid">
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
                  <div className="im-org-info-item im-org-info-item--full">
                    <span className="im-org-info-label">{t("orgDetail.website")}</span>
                    <span className="im-org-info-value">
                      <a href={org.website} target="_blank" rel="noopener noreferrer">
                        {org.website}
                      </a>
                    </span>
                  </div>
                )}
                {(org.metadata as { socialLinks?: Record<string, string> })?.socialLinks && (
                  <div className="im-org-info-item im-org-info-item--full">
                    <span className="im-org-info-label">{t("orgDetail.socialLinks")}</span>
                    <div className="im-social-links">
                      {((org.metadata as { socialLinks?: Record<string, string> })?.socialLinks?.facebook) && (
                        <a href={(org.metadata as { socialLinks?: Record<string, string> }).socialLinks!.facebook} target="_blank" rel="noopener noreferrer" className="im-social-link">
                          Facebook
                        </a>
                      )}
                      {((org.metadata as { socialLinks?: Record<string, string> })?.socialLinks?.instagram) && (
                        <a href={(org.metadata as { socialLinks?: Record<string, string> }).socialLinks!.instagram} target="_blank" rel="noopener noreferrer" className="im-social-link">
                          Instagram
                        </a>
                      )}
                      {((org.metadata as { socialLinks?: Record<string, string> })?.socialLinks?.linkedin) && (
                        <a href={(org.metadata as { socialLinks?: Record<string, string> }).socialLinks!.linkedin} target="_blank" rel="noopener noreferrer" className="im-social-link">
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {!org.contactEmail && !org.contactPhone && !org.website && !(org.metadata as { socialLinks?: Record<string, string> })?.socialLinks && (
                  <div className="im-org-info-item im-org-info-item--full">
                    <span className="im-org-info-value">{t("orgDetail.noContactInfo")}</span>
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

        {/* Basic Info Edit Modal */}
        <Modal
          isOpen={isEditingBasicInfo}
          onClose={() => setIsEditingBasicInfo(false)}
          title={t("orgDetail.editBasicInfo")}
        >
          {editError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {editError}
            </div>
          )}
          <BasicInfoStep
            formData={basicInfoData}
            fieldErrors={fieldErrors}
            isSubmitting={editing}
            onChange={handleBasicInfoChange}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditingBasicInfo(false)} disabled={editing}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveBasicInfo} disabled={editing}>
              {editing ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </Modal>

        {/* Address Edit Modal */}
        <Modal
          isOpen={isEditingAddress}
          onClose={() => setIsEditingAddress(false)}
          title={t("orgDetail.editAddress")}
        >
          {editError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {editError}
            </div>
          )}
          <AddressStep
            formData={addressData}
            fieldErrors={fieldErrors}
            isSubmitting={editing}
            onChange={handleAddressChange}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditingAddress(false)} disabled={editing}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveAddress} disabled={editing}>
              {editing ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </Modal>

        {/* Contacts Edit Modal */}
        <Modal
          isOpen={isEditingContacts}
          onClose={() => setIsEditingContacts(false)}
          title={t("orgDetail.editContacts")}
        >
          {editError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {editError}
            </div>
          )}
          <ContactsStep
            formData={contactsData}
            fieldErrors={fieldErrors}
            isSubmitting={editing}
            onChange={handleContactsChange}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditingContacts(false)} disabled={editing}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveContacts} disabled={editing}>
              {editing ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </Modal>

        {/* Change Owner Modal */}
        <Modal
          isOpen={isChangeOwnerModalOpen}
          onClose={() => setIsChangeOwnerModalOpen(false)}
          title={t("orgDetail.changeOwner")}
        >
          <form onSubmit={handleChangeOwner} className="space-y-4">
            {changeOwnerError && (
              <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
                {changeOwnerError}
              </div>
            )}

            <p className="im-reassign-warning">{t("orgDetail.changeOwnerWarning")}</p>

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

            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsChangeOwnerModalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={changingOwner || !selectedUserId}
              >
                {changingOwner ? t("common.processing") : t("orgDetail.changeOwner")}
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
