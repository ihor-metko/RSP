"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import { IMLink } from "@/components/ui/IMLink";
import {
  Button,
  Card,
  Input,
  Select,
  Textarea,
  Checkbox,
  RadioGroup,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  PageHeader,
} from "@/components/ui";
import type { SelectOption } from "@/components/ui/Select";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { formatPrice, dollarsToCents } from "@/utils/price";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";

import "./page.css";

// Types
interface GalleryImage {
  url: string;
  alt: string;
  file?: File;
  preview?: string;
  uploading?: boolean;
  error?: string;
}

interface CourtFormData {
  // Organization & Club Selection Steps
  organizationId: string;
  clubId: string;
  // Basic Step
  name: string;
  slug: string;
  type: string;
  courtFormat: string; // "SINGLE" | "DOUBLE" - only for padel courts
  surface: string;
  indoor: boolean;
  shortDescription: string;
  // Pricing Step
  defaultPrice: number; // UI decimal value
  currency: string;
  defaultSlotLengthMinutes: number;
  // Schedule Step
  courtOpenTime: string;
  courtCloseTime: string;
  // Media Step (handled separately)
  mainImage: GalleryImage | null;
  gallery: GalleryImage[];
  // Meta Step
  visibility: "draft" | "published";
  tags: string;
  maxPlayers: number;
  notes: string;
}

const defaultFormValues: CourtFormData = {
  organizationId: "",
  clubId: "",
  name: "",
  slug: "",
  type: "",
  courtFormat: "",
  surface: "",
  indoor: false,
  shortDescription: "",
  defaultPrice: 0,
  currency: "UAH",
  defaultSlotLengthMinutes: 60,
  courtOpenTime: "",
  courtCloseTime: "",
  mainImage: null,
  gallery: [],
  visibility: "draft",
  tags: "",
  maxPlayers: 4,
  notes: "",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateCourtPage() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();

  // User store for auth and role checks
  const hasRole = useUserStore(state => state.hasRole);
  const hasAnyRole = useUserStore(state => state.hasAnyRole);
  const adminStatus = useUserStore(state => state.adminStatus);
  const isHydrated = useUserStore(state => state.isHydrated);
  const isLoading = useUserStore(state => state.isLoading);
  const isLoggedIn = useUserStore(state => state.isLoggedIn);

  // Organization and Club stores
  const { organizations, fetchOrganizations, loading: orgsLoading } = useOrganizationStore();
  const { clubs, fetchClubsIfNeeded, loadingClubs: clubsLoading } = useAdminClubStore();
  const [clubIdFromUrl, setClubIdFromUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [stepErrors, setStepErrors] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Determine which steps to show based on user role
  const isRootAdmin = hasRole("ROOT_ADMIN");
  const isOrgAdmin = hasRole("ORGANIZATION_ADMIN");
  const isClubAdmin = hasRole("CLUB_ADMIN");

  // Build tabs array based on role
  const ALL_TABS = useMemo(() => {
    const tabs = [];

    // Tab 1: Context Selection (Organization & Club) - Only for Root/Org Admin
    if ((isRootAdmin || isOrgAdmin) && !clubIdFromUrl) {
      tabs.push({ id: "context", label: t("admin.courts.new.tabs.context") || "Context" });
    }

    // Tab 2: Basic Info
    tabs.push({ id: "basic", label: t("admin.courts.new.tabs.basic") || "Basic Info" });

    // Tab 4: Media
    tabs.push({ id: "media", label: t("admin.courts.new.tabs.media") || "Media" });

    return tabs;
  }, [isRootAdmin, isOrgAdmin, clubIdFromUrl, t]);

  const [currentTab, setCurrentTab] = useState(ALL_TABS[0]?.id || "basic");

  const COURT_TYPES: SelectOption[] = [
    { value: "padel", label: t("admin.courts.new.types.padel") },
    { value: "tennis", label: t("admin.courts.new.types.tennis") },
    { value: "squash", label: t("admin.courts.new.types.squash") },
    { value: "badminton", label: t("admin.courts.new.types.badminton") },
    { value: "pickleball", label: t("admin.courts.new.types.pickleball") },
  ];

  const SURFACE_TYPES: SelectOption[] = [
    { value: "artificial-grass", label: t("admin.courts.new.surfaces.artificialGrass") },
    { value: "clay", label: t("admin.courts.new.surfaces.clay") },
    { value: "hard", label: t("admin.courts.new.surfaces.hard") },
    { value: "grass", label: t("admin.courts.new.surfaces.grass") },
    { value: "carpet", label: t("admin.courts.new.surfaces.carpet") },
  ];

  // Slot lengths - commented out as currently unused
  // const SLOT_LENGTHS: SelectOption[] = [
  //   { value: "30", label: t("admin.courts.new.slotLengths.30") },
  //   { value: "60", label: t("admin.courts.new.slotLengths.60") },
  //   { value: "90", label: t("admin.courts.new.slotLengths.90") },
  //   { value: "120", label: t("admin.courts.new.slotLengths.120") },
  // ];

  // Form handling with react-hook-form
  const {
    register,
    control,
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
    trigger,
  } = useForm<CourtFormData>({
    defaultValues: defaultFormValues,
    mode: "onChange",
  });

  // Watch all values for preview
  const watchedValues = watch();
  const selectedOrgId = watch("organizationId");

  // Debounced preview values
  const [previewData, setPreviewData] = useState<CourtFormData>(defaultFormValues);

  // Filter clubs by selected organization (for club selection tab)
  const filteredClubs = useMemo(() => {
    if (isRootAdmin && selectedOrgId) {
      return clubs.filter(club => club.organization?.id === selectedOrgId);
    }
    if (isOrgAdmin && adminStatus?.managedIds) {
      // Org admin sees clubs within their organizations (supports multiple orgs)
      return clubs.filter(club => club.organization?.id && adminStatus.managedIds.includes(club.organization.id));
    }
    return clubs;
  }, [clubs, selectedOrgId, isRootAdmin, isOrgAdmin, adminStatus]);

  // Convert organizations to SelectOption format
  const organizationOptions: SelectOption[] = useMemo(() => {
    return organizations.map(org => ({
      value: org.id,
      label: org.name,
    }));
  }, [organizations]);

  // Convert filtered clubs to SelectOption format
  const clubOptions: SelectOption[] = useMemo(() => {
    return filteredClubs.map(club => ({
      value: club.id,
      label: club.name,
    }));
  }, [filteredClubs]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setPreviewData(watchedValues);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [watchedValues]);

  // Initialize clubId from URL search parameters (when navigating from club detail page)
  useEffect(() => {
    const clubIdParam = searchParams.get("clubId");
    if (clubIdParam) {
      setClubIdFromUrl(clubIdParam);
      setValue("clubId", clubIdParam);
    }
  }, [searchParams, setValue]);

  // Load organizations and clubs data for selection
  useEffect(() => {
    if (isRootAdmin && !clubIdFromUrl) {
      fetchOrganizations();
    }
    if ((isRootAdmin || isOrgAdmin) && !clubIdFromUrl) {
      fetchClubsIfNeeded();
    }
  }, [isRootAdmin, isOrgAdmin, clubIdFromUrl, fetchOrganizations, fetchClubsIfNeeded]);

  // Auto-populate org/club for org admins and club admins
  useEffect(() => {
    if (isOrgAdmin && adminStatus?.managedIds && adminStatus.managedIds.length > 0) {
      // For org admin, pre-select their first organization (most admins manage one org)
      // If admin manages multiple orgs, they can change it via the club selection
      const orgId = adminStatus.managedIds[0];
      setValue("organizationId", orgId);
    }

    if (isClubAdmin && adminStatus?.managedIds && adminStatus.managedIds.length > 0) {
      // For club admin, pre-select their club (organizationId will be populated when club data loads)
      const clubId = adminStatus.managedIds[0];
      setValue("clubId", clubId);
    }
  }, [isOrgAdmin, isClubAdmin, adminStatus, setValue]);

  // Auth check - allow any admin
  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!isLoggedIn || !hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN", "CLUB_ADMIN"])) {
      router.push("/auth/sign-in");
    }
  }, [isLoggedIn, isLoading, hasAnyRole, router, isHydrated]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Calculate progress percentage
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progressPercentage = useMemo(() => {
    const requiredFields = ["name"];
    const optionalFields = [
      "slug",
      "type",
      "surface",
      "shortDescription",
      "defaultPrice",
      "tags",
    ];

    let filled = 0;
    let total = requiredFields.length + optionalFields.length;

    requiredFields.forEach((field) => {
      if (watchedValues[field as keyof CourtFormData]) filled++;
    });

    optionalFields.forEach((field) => {
      if (watchedValues[field as keyof CourtFormData]) filled++;
    });

    if (watchedValues.mainImage) filled++;
    total++;

    return Math.round((filled / total) * 100);
  }, [watchedValues]);

  // Check if required fields are valid for publishing
  const canPublish = useMemo(() => {
    const nameValid = watchedValues.name && watchedValues.name.length >= 2 && watchedValues.name.length <= 120;
    const slugValid = !watchedValues.slug || /^[a-z0-9-]+$/.test(watchedValues.slug);
    const priceValid = watchedValues.defaultPrice >= 0;

    return nameValid && slugValid && priceValid;
  }, [watchedValues]);

  // Auto-generate slug from name
  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const name = e.target.value;
      const currentSlug = getValues("slug");

      // Auto-generate slug only if slug is empty or was auto-generated
      if (!currentSlug || currentSlug === generateSlug(getValues("name"))) {
        setValue("slug", generateSlug(name));
      }
    },
    [getValues, setValue]
  );

  // Image upload handler
  const uploadImage = async (file: File): Promise<{ url: string; key: string } | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t("admin.courts.new.errors.uploadFailed"));
      }

      return response.json();
    } catch (error) {
      console.error("Upload error:", error);
      return null;
    }
  };

  // Handle main image upload
  const handleMainImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setValue("mainImage", {
      url: "",
      alt: "",
      file,
      preview,
      uploading: true,
    });

    const result = await uploadImage(file);

    if (result) {
      setValue("mainImage", {
        url: result.url,
        alt: "",
        file,
        preview,
        uploading: false,
      });
    } else {
      setValue("mainImage", {
        url: "",
        alt: "",
        file,
        preview,
        uploading: false,
        error: t("admin.courts.new.errors.uploadFailed"),
      });
    }
  };

  // Handle gallery image upload
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentGallery = getValues("gallery");

    const newImages: GalleryImage[] = files.map((file) => ({
      url: "",
      alt: "",
      file,
      preview: URL.createObjectURL(file),
      uploading: true,
    }));

    setValue("gallery", [...currentGallery, ...newImages]);

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadImage(file);

      const updatedGallery = [...getValues("gallery")];
      const imageIndex = currentGallery.length + i;

      if (result) {
        updatedGallery[imageIndex] = {
          ...updatedGallery[imageIndex],
          url: result.url,
          uploading: false,
        };
      } else {
        updatedGallery[imageIndex] = {
          ...updatedGallery[imageIndex],
          uploading: false,
          error: t("admin.courts.new.errors.uploadFailed"),
        };
      }

      setValue("gallery", updatedGallery);
    }
  };

  // Remove main image
  const handleRemoveMainImage = () => {
    const mainImage = getValues("mainImage");
    if (mainImage?.preview) {
      URL.revokeObjectURL(mainImage.preview);
    }
    setValue("mainImage", null);
  };

  // Remove gallery image
  const handleRemoveGalleryImage = (index: number) => {
    const gallery = getValues("gallery");
    const image = gallery[index];
    if (image.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setValue(
      "gallery",
      gallery.filter((_, i) => i !== index)
    );
  };

  // Set main image from gallery
  const handleSetAsMain = (index: number) => {
    const gallery = getValues("gallery");
    const mainImage = getValues("mainImage");
    const selectedImage = gallery[index];

    // Swap: current main goes to gallery, selected becomes main
    const newGallery = gallery.filter((_, i) => i !== index);
    if (mainImage) {
      newGallery.unshift(mainImage);
    }

    setValue("mainImage", selectedImage);
    setValue("gallery", newGallery);
  };

  // Validation per tab
  const validateTab = useCallback(
    async (tabId: string): Promise<boolean> => {
      let fieldsToValidate: (keyof CourtFormData)[] = [];

      switch (tabId) {
        case "context":
          if (isRootAdmin) {
            fieldsToValidate.push("organizationId");
          }
          if (isRootAdmin || isOrgAdmin) {
            fieldsToValidate.push("clubId");
          }
          break;
        case "basic":
          fieldsToValidate = ["name", "slug"];
          // Add courtFormat validation only if type is padel
          if (watch("type") === "padel") {
            fieldsToValidate.push("courtFormat");
          }
          break;
        case "pricing-schedule":
          fieldsToValidate = ["defaultPrice"];
          break;
        case "settings":
          fieldsToValidate = ["maxPlayers"];
          break;
        default:
          break;
      }

      const result = await trigger(fieldsToValidate);
      setStepErrors((prev) => ({ ...prev, [tabId]: !result }));
      return result;
    },
    [trigger, isRootAdmin, isOrgAdmin, watch]
  );

  // Navigate to tab
  const handleTabChange = async (tabId: string) => {
    // Validate current tab before leaving
    await validateTab(currentTab);
    setCurrentTab(tabId);
    return true;
  };

  // Submit handler
  const onSubmit = async (data: CourtFormData, visibility: "draft" | "published") => {
    const targetClubId = data.clubId || clubIdFromUrl;

    if (!targetClubId) {
      showToast("error", t("admin.courts.new.toast.pleaseSelectClub"));
      return;
    }

    // Validate all tabs
    let allValid = true;
    for (const tab of ALL_TABS) {
      const valid = await validateTab(tab.id);
      if (!valid) allValid = false;
    }

    if (!allValid && visibility === "published") {
      showToast("error", t("admin.courts.new.toast.fixValidationErrors"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build payload
      const payload = {
        name: data.name.trim(),
        slug: data.slug.trim() || null,
        type: data.type || null,
        courtFormat: data.type === "padel" && data.courtFormat ? data.courtFormat.toUpperCase() : null,
        surface: data.surface || null,
        indoor: data.indoor,
        description: data.shortDescription || null,
        defaultPriceCents: dollarsToCents(data.defaultPrice),
        defaultSlotLengthMinutes: data.defaultSlotLengthMinutes,
        // No courtOpenTime/courtCloseTime - courts inherit club schedule
        mainImage: data.mainImage?.url || null,
        gallery: data.gallery
          .filter((img) => img.url && !img.error)
          .map((img) => ({ url: img.url, alt: img.alt })),
        isPublished: visibility === "published",
        tags: data.tags || null,
        maxPlayers: data.maxPlayers || null,
        notes: data.notes || null,
      };

      const response = await fetch(`/api/admin/clubs/${targetClubId}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Slug conflict
          setStepErrors((prev) => ({ ...prev, basic: true }));
          setCurrentTab("basic");
          showToast("error", t("admin.courts.new.toast.slugAlreadyExists", { suggestion: `${data.slug}-1` }));
          return;
        }
        throw new Error(result.error || t("admin.courts.new.errors.failedToCreateCourt"));
      }

      showToast("success", t("admin.courts.new.toast.courtCreatedSuccess"));

      // Redirect to the newly created court detail page
      setTimeout(() => {
        router.push(`/admin/courts/${result.id}`);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("admin.courts.new.errors.failedToCreateCourt");
      setError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Context Tab (Organization & Club Selection)
  const renderContextTab = () => {
    return (
      <div className="im-create-court-tab-content">
        <div className="im-tab-section">
          <h3 className="im-section-title">{t("admin.courts.new.contextTab.title")}</h3>
          <p className="im-section-description">
            {t("admin.courts.new.contextTab.description")}
          </p>

          {isRootAdmin && (
            <Controller
              name="organizationId"
              control={control}
              rules={{
                required: t("admin.courts.new.errors.organizationRequired"),
              }}
              render={({ field }) => (
                <Select
                  label={t("admin.courts.new.contextTab.organization") + " *"}
                  options={[
                    { value: "", label: t("admin.courts.new.contextTab.selectOrganization") },
                    ...organizationOptions,
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting || orgsLoading}
                />
              )}
            />
          )}
          {errors.organizationId && (
            <span className="im-error-text">{errors.organizationId.message}</span>
          )}
        </div>

        {(isRootAdmin || isOrgAdmin) && (
          <div className="im-tab-section">
            <Controller
              name="clubId"
              control={control}
              rules={{
                required: t("admin.courts.new.errors.clubRequired"),
              }}
              render={({ field }) => (
                <Select
                  label={t("admin.courts.new.contextTab.club") + " *"}
                  options={[
                    { value: "", label: t("admin.courts.new.contextTab.selectClub") },
                    ...clubOptions,
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting || clubsLoading}
                />
              )}
            />
            {isOrgAdmin && (
              <span className="im-hint-text">{t("admin.courts.new.contextTab.orgAdminHint")}</span>
            )}
            {errors.clubId && (
              <span className="im-error-text">{errors.clubId.message}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // Basic Tab
  const renderBasicTab = () => (
    <div className="im-create-court-tab-content">
      <div className="im-tab-section">
        <h3 className="im-section-title">{t("admin.courts.new.basicTab.title")}</h3>
        <p className="im-section-description">
          {t("admin.courts.new.basicTab.description")}
        </p>
      </div>

      <div className="im-tab-section">
        <Input
          {...register("name", {
            required: t("admin.courts.new.errors.nameRequired"),
            minLength: { value: 2, message: t("admin.courts.new.errors.nameMinLength") },
            maxLength: { value: 120, message: t("admin.courts.new.errors.nameMaxLength") },
          })}
          onChange={(e) => {
            register("name").onChange(e);
            handleNameChange(e);
          }}
          label={t("admin.courts.new.basicTab.courtName") + " *"}
          placeholder={t("admin.courts.new.basicTab.courtNamePlaceholder")}
          disabled={isSubmitting}
        />
        {errors.name && <span className="im-error-text">{errors.name.message}</span>}
      </div>
      <Controller
        name="type"
        control={control}
        render={({ field }) => (
          <Select
            label={t("admin.courts.new.basicTab.courtType")}
            options={[
              { value: "", label: t("admin.courts.new.basicTab.selectType") },
              ...COURT_TYPES,
            ]}
            value={field.value}
            onChange={field.onChange}
            disabled={isSubmitting}
          />
        )}
      />

      {/* Padel Court Format - Only show when type is "padel" */}
      {watch("type") === "padel" && (
        <div className="im-tab-section">
          <Controller
            name="courtFormat"
            control={control}
            rules={{
              required: watch("type") === "padel" ? t("admin.courts.new.errors.courtFormatRequired") : false,
            }}
            render={({ field }) => (
              <RadioGroup
                label={t("admin.courts.new.basicTab.courtFormat") + " *"}
                name="courtFormat"
                options={[
                  {
                    value: "SINGLE",
                    label: t("admin.courts.new.basicTab.courtFormatSingle"),
                  },
                  {
                    value: "DOUBLE",
                    label: t("admin.courts.new.basicTab.courtFormatDouble"),
                  },
                ]}
                value={field.value}
                onChange={field.onChange}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.courtFormat && (
            <span className="im-error-text">{errors.courtFormat.message}</span>
          )}
        </div>
      )}

      <Controller
        name="surface"
        control={control}
        render={({ field }) => (
          <Select
            label={t("admin.courts.new.basicTab.surface")}
            options={[
              { value: "", label: t("admin.courts.new.basicTab.selectSurface") },
              ...SURFACE_TYPES,
            ]}
            value={field.value}
            onChange={field.onChange}
            disabled={isSubmitting}
          />
        )}
      />

      <Checkbox
        {...register("indoor")}
        label={t("admin.courts.new.basicTab.indoorCourt")}
        disabled={isSubmitting}
      />

      <Textarea
        {...register("shortDescription")}
        label={t("admin.courts.new.basicTab.shortDescription")}
        placeholder={t("admin.courts.new.basicTab.shortDescriptionPlaceholder")}
        rows={3}
        disabled={isSubmitting}
      />
    </div>
  );

  // Media Tab
  const renderMediaTab = () => {
    const mainImage = watch("mainImage");
    const gallery = watch("gallery");

    return (
      <div className="im-create-court-tab-content">
        <div className="im-tab-section">
          <h3 className="im-section-title">{t("admin.courts.new.mediaTab.title")}</h3>
          <p className="im-section-description">
            {t("admin.courts.new.mediaTab.description")}
          </p>

          {/* Main Image */}
          <div className="im-media-section">
            <label className="im-label">{t("admin.courts.new.mediaTab.mainImage")}</label>
            {mainImage ? (
              <div className="im-create-court-gallery-item im-create-court-gallery-item--main" style={{ width: "150px" }}>
                {mainImage.uploading ? (
                  <div className="im-create-court-upload-progress">
                    <div className="im-create-court-spinner" />
                    <span>{t("admin.courts.new.mediaTab.uploading")}</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mainImage.preview || mainImage.url}
                      alt={t("admin.courts.new.preview.mainImageAlt", { name: watchedValues.name || t("admin.courts.new.preview.newCourt") })}
                      className="im-create-court-gallery-image"
                    />
                    <div className="im-create-court-gallery-actions">
                      <button
                        type="button"
                        className="im-create-court-gallery-btn"
                        onClick={handleRemoveMainImage}
                        aria-label={t("admin.courts.new.aria.removeMainImage")}
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
                {mainImage.error && (
                  <span className="im-error-text">{mainImage.error}</span>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="im-create-court-gallery-add"
                style={{ width: "150px" }}
                onClick={() => mainImageInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <span className="im-create-court-gallery-add-icon">+</span>
                <span>{t("admin.courts.new.mediaTab.addMainImage")}</span>
              </button>
            )}
            <input
              ref={mainImageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleMainImageUpload}
              style={{ display: "none" }}
              disabled={isSubmitting}
            />
          </div>

          {/* Gallery */}
          <div className="im-media-section">
            <label className="im-label">{t("admin.courts.new.mediaTab.gallery")}</label>
            <span className="im-hint-text" style={{ marginBottom: "0.5rem", display: "block" }}>
              {t("admin.courts.new.mediaTab.galleryHint")}
            </span>

            <div className="im-create-court-gallery-grid">
              {gallery.map((image, index) => (
                <div key={index} className="im-create-court-gallery-item">
                  {image.uploading ? (
                    <div className="im-create-court-upload-progress">
                      <div className="im-create-court-spinner" />
                    </div>
                  ) : (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.preview || image.url}
                        alt={t("admin.courts.new.preview.galleryImageAlt", { index: index + 1, name: watchedValues.name || t("admin.courts.new.preview.newCourt") })}
                        className="im-create-court-gallery-image"
                        onClick={() => handleSetAsMain(index)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handleSetAsMain(index);
                          }
                        }}
                        style={{ cursor: "pointer" }}
                        tabIndex={0}
                        role="button"
                        aria-label={t("admin.courts.new.aria.setAsMainImage", { index: index + 1 })}
                      />
                      <div className="im-create-court-gallery-actions">
                        <button
                          type="button"
                          className="im-create-court-gallery-btn"
                          onClick={() => handleRemoveGalleryImage(index)}
                          aria-label={t("admin.courts.new.aria.removeGalleryImage", { index: index + 1 })}
                          disabled={isSubmitting}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                  {image.error && (
                    <span className="im-error-text">{image.error}</span>
                  )}
                </div>
              ))}

              <button
                type="button"
                className="im-create-court-gallery-add"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isSubmitting}
              >
                <span className="im-create-court-gallery-add-icon">+</span>
                <span>{t("admin.courts.new.mediaTab.add")}</span>
              </button>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleGalleryUpload}
              style={{ display: "none" }}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="im-create-court-page">
        <PageHeaderSkeleton showDescription />
        <div className="im-create-court-layout">
          <FormSkeleton fields={10} showButton />
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="im-create-court-page">
        <div className="im-create-court-layout">
          <Card>
            <div className="im-create-court-error-banner">{error}</div>
            <div style={{ marginTop: "1rem" }}>
              <IMLink href="/admin/clubs">{t("admin.courts.new.actions.backToClubs")}</IMLink>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="im-create-court-page">
      {/* Toast */}
      {toast && (
        <div
          className={`im-create-court-toast im-create-court-toast--${toast.type}`}
          role="alert"
        >
          {toast.message}
        </div>
      )}

      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="im-create-court-submitting-overlay">
          <div className="im-create-court-submitting-content">
            <div className="im-create-court-submitting-spinner" />
            <span className="im-create-court-submitting-text">{t("admin.courts.new.submitting.creating")}</span>
          </div>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title={t("admin.courts.new.pageTitle") || "Create New Court"}
        description={t("admin.courts.new.pageDescription") || "Add a new court to your club"}
        actions={
          <div className="im-create-court-header-actions">
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit((data) => onSubmit(data, "draft"))}
              disabled={isSubmitting}
            >
              {t("admin.courts.new.actions.saveDraft")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, "published"))}
              disabled={isSubmitting || !canPublish}
            >
              {t("admin.courts.new.actions.saveAndPublish")}
            </Button>
          </div>
        }
      />

      {/* Main Layout */}
      <div className="im-create-court-layout">
        {/* Left Column - Tabs */}
        <div className="im-create-court-content">
          <Card>
            {/* Error Banner */}
            {error && (
              <div className="im-create-court-error-banner" role="alert">
                {error}
              </div>
            )}

            <Tabs defaultTab={currentTab} onTabChange={handleTabChange}>
              <TabList>
                {ALL_TABS.map((tab) => {
                  const hasError = stepErrors[tab.id];
                  return (
                    <Tab
                      key={tab.id}
                      id={tab.id}
                      label={tab.label}
                      className={hasError ? "im-tab--error" : ""}
                    />
                  );
                })}
              </TabList>

              <TabPanel id="context">
                {renderContextTab()}
              </TabPanel>
              <TabPanel id="basic">
                {renderBasicTab()}
              </TabPanel>
              <TabPanel id="media">
                {renderMediaTab()}
              </TabPanel>
            </Tabs>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className={`im-create-court-preview-wrapper ${previewCollapsed ? "im-create-court-preview-wrapper--collapsed" : ""}`}>
          <button
            type="button"
            className="im-create-court-preview-toggle"
            onClick={() => setPreviewCollapsed(!previewCollapsed)}
          >
            {previewCollapsed ? t("admin.courts.new.preview.show") : t("admin.courts.new.preview.hide")}
          </button>

          <div className="im-create-court-preview">
            <div className="im-create-court-preview-header">
              <h3 className="im-create-court-preview-title">{t("admin.courts.new.preview.title")}</h3>
              <span
                className={`im-create-court-preview-status ${canPublish ? "im-create-court-preview-status--ready" : "im-create-court-preview-status--draft"}`}
              >
                {canPublish ? t("admin.courts.new.preview.readyToPublish") : t("admin.courts.new.preview.draft")}
              </span>
            </div>

            {/* Preview Image */}
            <div className="im-create-court-preview-image">
              {previewData.mainImage?.preview || previewData.mainImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewData.mainImage.preview || previewData.mainImage.url}
                  alt={t("admin.courts.new.preview.previewImageAlt", { name: previewData.name || t("admin.courts.new.preview.newCourt") })}
                />
              ) : (
                <div className="im-create-court-preview-placeholder">
                  <span className="im-create-court-preview-placeholder-icon">📷</span>
                  <span>{t("admin.courts.new.preview.addImage")}</span>
                </div>
              )}
            </div>

            {/* Preview Body */}
            <div className="im-create-court-preview-body">
              <h4 className="im-create-court-preview-name">
                {previewData.name || t("admin.courts.new.preview.courtNamePlaceholder")}
              </h4>

              <div className="im-create-court-preview-badges">
                {previewData.indoor ? (
                  <span className="im-create-court-preview-badge im-create-court-preview-badge--indoor">
                    {t("common.indoor")}
                  </span>
                ) : (
                  <span className="im-create-court-preview-badge im-create-court-preview-badge--outdoor">
                    {t("common.outdoor")}
                  </span>
                )}
                {previewData.type && (
                  <span className="im-create-court-preview-badge">
                    {COURT_TYPES.find((t) => t.value === previewData.type)?.label || previewData.type}
                  </span>
                )}
                {previewData.surface && (
                  <span className="im-create-court-preview-badge">
                    {SURFACE_TYPES.find((s) => s.value === previewData.surface)?.label || previewData.surface}
                  </span>
                )}
              </div>

              <div className="im-create-court-preview-price">
                {formatPrice(dollarsToCents(previewData.defaultPrice))} / {previewData.defaultSlotLengthMinutes} {t("admin.courts.new.preview.perMinutes")}
              </div>

              {previewData.shortDescription && (
                <p className="im-create-court-preview-description">
                  {previewData.shortDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
