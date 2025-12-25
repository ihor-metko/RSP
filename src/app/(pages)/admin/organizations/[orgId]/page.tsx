"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, EntityBanner, MetricCardSkeleton, OrgInfoCardSkeleton, ClubsPreviewSkeleton, TableSkeleton, BookingsPreviewSkeleton, ImageUpload } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useUserStore } from "@/stores/useUserStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import OrganizationAdminsTable from "@/components/admin/OrganizationAdminsTable";
import { EntityEditStepper } from "@/components/admin/EntityEditStepper.client";
import { BasicInfoStep, AddressStep, LogoStep, BannerStep } from "@/components/admin/OrganizationSteps";
import type { AdminBookingResponse } from "@/app/api/admin/bookings/route";

import "./page.css";
import "@/components/ClubDetailPage.css";

// Basic interfaces for this component
// Note: Defined locally to avoid coupling with full User model from Prisma

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
  const router = useRouter();
  const params = useParams();
  const orgId = params?.orgId as string;
  
  // Use store for auth
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);

  // Use Zustand store
  const ensureOrganizationById = useOrganizationStore((state) => state.ensureOrganizationById);
  const org = useOrganizationStore((state) => state.getOrganizationDetailById(orgId));
  const updateOrganization = useOrganizationStore((state) => state.updateOrganization);
  const loading = useOrganizationStore((state) => state.loading);
  const storeError = useOrganizationStore((state) => state.error);
  // Note: deleteOrganization and archive functionality removed as per requirement to simplify the page
  // Archive/Delete modals can be re-added later if needed via the Danger Zone section

  const [bookingsPreview, setBookingsPreview] = useState<BookingsPreviewData | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [error, setError] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Edit modal state
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  // Change owner modal
  const [isChangeOwnerModalOpen, setIsChangeOwnerModalOpen] = useState(false);
  const simpleUsers = useAdminUsersStore((state) => state.simpleUsers);
  const fetchSimpleUsers = useAdminUsersStore((state) => state.fetchSimpleUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [changeOwnerError, setChangeOwnerError] = useState("");
  const [changingOwner, setChangingOwner] = useState(false);



  // Image upload modals
  const [isEditingLogo, setIsEditingLogo] = useState(false);
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  // Publication toggle
  const [isTogglingPublication, setIsTogglingPublication] = useState(false);

  // Fetch organization from store (with fetch-if-missing pattern)
  const fetchOrgDetail = useCallback(async (force = false) => {
    try {
      setError("");
      await ensureOrganizationById(orgId, { force });
    } catch (err) {
      setError(t("orgDetail.failedToLoad"));
      console.error("Failed to load organization:", err);
    }
  }, [orgId, ensureOrganizationById, t]);

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
            status: b.bookingStatus,
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
    if (!isHydrated || isLoading) return;
    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }
    
    // Fetch organization data from store (will use cache if available)
    fetchOrgDetail();
    fetchBookingsPreview();
  }, [isLoggedIn, isLoading, router, orgId, fetchOrgDetail, fetchBookingsPreview, isHydrated]);

  // Debounced user search
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (isReassignModalOpen && reassignMode === "existing") {
  //       fetchUsers(userSearch);
  //     }
  //   }, 300);
  //   return () => clearTimeout(timer);
  // }, [userSearch, isReassignModalOpen, reassignMode, fetchUsers]);

  // Handler for opening edit modal
  const handleOpenDetailsEdit = () => {
    setIsEditingDetails(true);
  };

  // Stepper save handler for editing entity details with images
  const handleStepperSave = async (data: {
    name: string;
    slug: string;
    description: string | null;
    address: string;
    metadata: Record<string, unknown>;
    logo?: File | null;
    heroImage?: File | null;
  }) => {
    try {
      // Update organization details first
      await updateOrganization(orgId, {
        name: data.name,
        slug: data.slug,
        description: data.description,
        address: data.address,
        metadata: {
          ...(org?.metadata as object || {}),
          ...data.metadata,
        },
      });

      // Upload images if new files were provided
      if (data.logo) {
        const logoFormData = new FormData();
        logoFormData.append("file", data.logo);
        logoFormData.append("type", "logo");

        const logoResponse = await fetch(`/api/images/organizations/${orgId}/upload`, {
          method: "POST",
          body: logoFormData,
        });

        if (!logoResponse.ok) {
          const errorData = await logoResponse.json();
          throw new Error(errorData.error || t("organizations.errors.imageUploadFailed"));
        }
      }

      if (data.heroImage) {
        const heroFormData = new FormData();
        heroFormData.append("file", data.heroImage);
        heroFormData.append("type", "heroImage");

        const heroResponse = await fetch(`/api/images/organizations/${orgId}/upload`, {
          method: "POST",
          body: heroFormData,
        });

        if (!heroResponse.ok) {
          const errorData = await heroResponse.json();
          throw new Error(errorData.error || t("organizations.errors.imageUploadFailed"));
        }
      }

      showToast(t("orgDetail.updateSuccess"), "success");
      // Force refresh to get updated data including images
      await fetchOrgDetail(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("organizations.errors.updateFailed");
      showToast(message, "error");
      throw err; // Re-throw to let the stepper handle the error
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
      // Force refresh to get updated owner data
      await fetchOrgDetail(true);
    } catch (err) {
      setChangeOwnerError(err instanceof Error ? err.message : t("organizations.errors.changeOwnerFailed"));
    } finally {
      setChangingOwner(false);
    }
  };



  // Image upload handlers
  const handleOpenLogoEdit = () => {
    if (!org) return;
    // Initialize with current logo URL (not data URL)
    setLogoPreview(org.logo || null);
    setImageUploadError("");
    setIsEditingLogo(true);
  };

  const handleOpenBannerEdit = () => {
    if (!org) return;
    // Initialize with current banner URL (not data URL)
    setBannerPreview(org.heroImage || null);
    setImageUploadError("");
    setIsEditingBanner(true);
  };

  const handleLogoChange = (dataUrl: string | null) => {
    setLogoPreview(dataUrl);
    // Extract file from ImageUpload if available (we'll need to modify ImageUpload to also return the file)
    // For now, we'll handle this by converting the data URL back to a file when saving
  };

  const handleBannerChange = (dataUrl: string | null) => {
    setBannerPreview(dataUrl);
    // Extract file from ImageUpload if available
  };

  const uploadImageFile = async (file: File, imageType: 'logo' | 'heroImage'): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", imageType);

    const response = await fetch(`/api/images/organizations/${orgId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Upload failed");
    }

    const result = await response.json();
    return result.url;
  };

  const dataUrlToFile = async (dataUrl: string, mimeType: string = 'image/jpeg'): Promise<File> => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    // Determine file extension from MIME type
    const extension = mimeType.split('/')[1] || 'jpg';
    const filename = `image.${extension}`;
    return new File([blob], filename, { type: blob.type });
  };

  const handleSaveLogo = async () => {
    setImageUploadError("");
    setUploadingImage(true);

    try {
      let logoUrl: string | null | undefined = undefined;

      // Check if preview is a new data URL (indicating a new upload)
      const isNewUpload = logoPreview && logoPreview.startsWith("data:");
      // Check if image was removed
      const isRemoved = !logoPreview && org?.logo;

      if (isNewUpload) {
        // New image selected - convert data URL to file and upload
        // NOTE: This is a temporary workaround. Ideally, ImageUpload should return
        // both the preview data URL and the original File object to avoid conversion overhead.
        // Extract MIME type from data URL
        const mimeMatch = logoPreview.match(/^data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const file = await dataUrlToFile(logoPreview, mimeType);
        logoUrl = await uploadImageFile(file, "logo");
      } else if (isRemoved) {
        // Image removed
        logoUrl = null;
      } else if (logoPreview !== org?.logo) {
        // Existing URL changed (shouldn't happen, but handle it)
        logoUrl = logoPreview;
      }

      // Only update if there's a change
      if (logoUrl !== undefined) {
        await updateOrganization(orgId, { logo: logoUrl });
      }

      showToast(t("orgDetail.logoUpdateSuccess"), "success");
      setIsEditingLogo(false);
      // Force refresh to get updated logo
      await fetchOrgDetail(true);
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : t("organizations.errors.updateFailed"));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveBanner = async () => {
    setImageUploadError("");
    setUploadingImage(true);

    try {
      let bannerUrl: string | null | undefined = undefined;

      // Check if preview is a new data URL (indicating a new upload)
      const isNewUpload = bannerPreview && bannerPreview.startsWith("data:");
      // Check if image was removed
      const isRemoved = !bannerPreview && org?.heroImage;

      if (isNewUpload) {
        // New image selected - convert data URL to file and upload
        // NOTE: This is a temporary workaround. Ideally, ImageUpload should return
        // both the preview data URL and the original File object to avoid conversion overhead.
        // Extract MIME type from data URL
        const mimeMatch = bannerPreview.match(/^data:([^;]+);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const file = await dataUrlToFile(bannerPreview, mimeType);
        bannerUrl = await uploadImageFile(file, "heroImage");
      } else if (isRemoved) {
        // Image removed
        bannerUrl = null;
      } else if (bannerPreview !== org?.heroImage) {
        // Existing URL changed (shouldn't happen, but handle it)
        bannerUrl = bannerPreview;
      }

      // Only update if there's a change
      if (bannerUrl !== undefined) {
        await updateOrganization(orgId, { heroImage: bannerUrl });
      }

      showToast(t("orgDetail.bannerUpdateSuccess"), "success");
      setIsEditingBanner(false);
      // Force refresh to get updated banner
      await fetchOrgDetail(true);
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : t("organizations.errors.updateFailed"));
    } finally {
      setUploadingImage(false);
    }
  };

  // Publication toggle handler
  const handleTogglePublication = async () => {
    if (!org) return;

    setIsTogglingPublication(true);
    try {
      const newPublicStatus = !org.isPublic;
      await updateOrganization(orgId, { isPublic: newPublicStatus });
      showToast(
        newPublicStatus ? t("orgDetail.publishSuccess") : t("orgDetail.unpublishSuccess"),
        "success"
      );
      // Force refresh to get updated publication status
      await fetchOrgDetail(true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("organizations.errors.updateFailed"), "error");
    } finally {
      setIsTogglingPublication(false);
    }
  };



  // Show loading spinner while checking authentication or loading org
  const isLoadingState = !isHydrated || isLoading || loading;

  return (
    <main className="im-org-detail-page">
      {/* Organization Banner */}
      {isLoadingState ? (
        <div className="im-section-card">
          <div className="im-skeleton h-32 w-full rounded-lg" />
        </div>
      ) : (error || storeError) && !org ? (
        <div className="im-org-detail-error">
          <p>{error || storeError || t("orgDetail.notFound")}</p>
          <Button onClick={() => router.push("/admin/organizations")}>
            {t("common.backToDashboard")}
          </Button>
        </div>
      ) : org && (
        <>
          <EntityBanner
            title={org.name}
            subtitle={org.description || null}
            location={org.address}
            imageUrl={org.heroImage}
            logoUrl={org.logo}
            logoMetadata={org.metadata && typeof org.metadata === 'object' && 'logoMetadata' in org.metadata ? org.metadata.logoMetadata as { logoTheme?: 'light' | 'dark'; secondLogo?: string | null; secondLogoTheme?: 'light' | 'dark'; } : undefined}
            imageAlt={`${org.name} banner`}
            logoAlt={`${org.name} logo`}
            isPublished={org.isPublic ?? true}
            onTogglePublish={handleTogglePublication}
            isTogglingPublish={isTogglingPublication}
            isArchived={!!org.archivedAt}
            onEdit={!org.archivedAt ? handleOpenDetailsEdit : undefined}
          />
          {!org.archivedAt && (
            <div className="im-banner-actions">
              <Button
                variant="outline"
                size="small"
                onClick={handleOpenLogoEdit}
              >
                {org.logo ? t("orgDetail.updateLogo") : t("orgDetail.addLogo")}
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={handleOpenBannerEdit}
              >
                {org.heroImage ? t("orgDetail.updateBanner") : t("orgDetail.addBanner")}
              </Button>
            </div>
          )}
        </>
      )}

      <div className="rsp-club-content">
        {/* Toast */}
        {toast && (
          <div className={`im-toast im-toast--${toast.type}`}>{toast.message}</div>
        )}

        <section className="im-org-detail-content">
          {/* Organization Owner Section */}
          {isLoadingState ? (
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



          {/* Key Metrics */}
          {isLoadingState ? (
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
                  <div className="im-metric-value">{org.metrics?.totalClubs ?? 0}</div>
                  <div className="im-metric-label">{t("orgDetail.totalClubs")}</div>
                </div>
                <div className="im-metric-card im-metric-card--courts">
                  <div className="im-metric-value">{org.metrics?.totalCourts ?? 0}</div>
                  <div className="im-metric-label">{t("orgDetail.totalCourts")}</div>
                </div>
                <div className="im-metric-card im-metric-card--bookings">
                  <div className="im-metric-value">{org.metrics?.activeBookings ?? 0}</div>
                  <div className="im-metric-label">{t("orgDetail.activeBookings")}</div>
                </div>
                <div className="im-metric-card im-metric-card--users">
                  <div className="im-metric-value">{org.metrics?.activeUsers ?? 0}</div>
                  <div className="im-metric-label">{t("orgDetail.activeUsers")}</div>
                </div>
              </div>
            </div>
          )}

          {/* Clubs Preview */}
          {isLoadingState ? (
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
              {(org.clubsPreview ?? []).length === 0 ? (
                <p className="im-preview-empty">{t("orgDetail.noClubs")}</p>
              ) : (
                <>
                  <div className="im-clubs-preview-list">
                    {(org.clubsPreview ?? []).map((club) => (
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
                  {(org.metrics?.totalClubs ?? 0) > (org.clubsPreview ?? []).length && (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => router.push(`/admin/organizations/${orgId}/clubs`)}
                      className="im-view-all-btn"
                    >
                      {t("orgDetail.viewAllClubs")} ({org.metrics?.totalClubs})
                    </Button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Organization Admins Management */}
          {loading || !org ? (
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
                admins={(org.superAdmins || []).map(admin => ({
                  id: admin.membershipId,
                  type: "superadmin" as const,
                  userId: admin.id,
                  userName: admin.name,
                  userEmail: admin.email,
                  isPrimaryOwner: admin.isPrimaryOwner,
                  // Note: lastLoginAt is not available from organization detail endpoint
                  // Consider enhancing the store to fetch this data separately if needed
                  lastLoginAt: null,
                  createdAt: new Date(), // Placeholder, not displayed in UI
                }))}
                onRefresh={() => fetchOrgDetail(true)}
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


        </section>

        {/* Entity Edit Stepper Modal */}
        {org && (
          <EntityEditStepper
            isOpen={isEditingDetails}
            onClose={() => setIsEditingDetails(false)}
            entityData={org}
            steps={[
              { id: 1, label: t("organizations.stepper.stepBasicInfo") },
              { id: 2, label: t("organizations.stepper.stepAddress") },
              { id: 3, label: t("organizations.stepper.stepLogo") },
              { id: 4, label: t("organizations.stepper.stepBanner") },
            ]}
            stepComponents={[BasicInfoStep, AddressStep, LogoStep, BannerStep]}
            translationNamespace="organizations.stepper"
            onSave={handleStepperSave}
          />
        )}

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

        {/* Logo Upload Modal */}
        <Modal
          isOpen={isEditingLogo}
          onClose={() => setIsEditingLogo(false)}
          title={t("orgDetail.editLogo")}
        >
          {imageUploadError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {imageUploadError}
            </div>
          )}
          <ImageUpload
            currentImage={logoPreview}
            label={t("orgDetail.organizationLogo")}
            onChange={handleLogoChange}
            isLoading={uploadingImage}
            aspectRatio="1:1"
            maxSizeMB={5}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditingLogo(false)} disabled={uploadingImage}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveLogo} disabled={uploadingImage}>
              {uploadingImage ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </Modal>

        {/* Banner Upload Modal */}
        <Modal
          isOpen={isEditingBanner}
          onClose={() => setIsEditingBanner(false)}
          title={t("orgDetail.editBanner")}
        >
          {imageUploadError && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm mb-4">
              {imageUploadError}
            </div>
          )}
          <ImageUpload
            currentImage={bannerPreview}
            label={t("orgDetail.organizationBanner")}
            onChange={handleBannerChange}
            isLoading={uploadingImage}
            aspectRatio="16:9"
            maxSizeMB={5}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsEditingBanner(false)} disabled={uploadingImage}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSaveBanner} disabled={uploadingImage}>
              {uploadingImage ? t("common.processing") : t("common.save")}
            </Button>
          </div>
        </Modal>
      </div>
    </main>
  );
}
