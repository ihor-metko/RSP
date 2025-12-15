"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { Button, Card, Breadcrumbs } from "@/components/ui";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";
import { formatPrice, dollarsToCents } from "@/utils/price";
import { useUserStore } from "@/stores/useUserStore";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";

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

interface Club {
  id: string;
  name: string;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
  } | null;
  defaultCurrency?: string;
  businessHours?: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>;
}

const defaultFormValues: CourtFormData = {
  organizationId: "",
  clubId: "",
  name: "",
  slug: "",
  type: "",
  surface: "",
  indoor: false,
  shortDescription: "",
  defaultPrice: 0,
  currency: "USD",
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

export default function CreateCourtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // User store for role checks
  const hasRole = useUserStore(state => state.hasRole);
  const hasAnyRole = useUserStore(state => state.hasAnyRole);
  const adminStatus = useUserStore(state => state.adminStatus);
  
  // Organization and Club stores
  const { organizations, fetchOrganizations, loading: orgsLoading } = useOrganizationStore();
  const { clubs, fetchClubsIfNeeded, loadingClubs: clubsLoading } = useClubStore();
  
  const [clubIdFromUrl, setClubIdFromUrl] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
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
  
  // Build steps array based on role
  const ALL_STEPS = useMemo(() => {
    const steps = [];
    let stepNumber = 1;
    
    // Step 1: Organization Selection (Root Admin only)
    if (isRootAdmin && !clubIdFromUrl) {
      steps.push({ id: "organization", label: t("admin.courts.new.steps.organization"), number: stepNumber++ });
    }
    
    // Step 2: Club Selection (Root Admin and Org Admin only, not Club Admin)
    if ((isRootAdmin || isOrgAdmin) && !isClubAdmin && !clubIdFromUrl) {
      steps.push({ id: "club", label: t("admin.courts.new.steps.club"), number: stepNumber++ });
    }
    
    // Existing steps
    steps.push({ id: "basic", label: t("admin.courts.new.steps.basic"), number: stepNumber++ });
    steps.push({ id: "pricing", label: t("admin.courts.new.steps.pricing"), number: stepNumber++ });
    steps.push({ id: "schedule", label: t("admin.courts.new.steps.schedule"), number: stepNumber++ });
    steps.push({ id: "media", label: t("admin.courts.new.steps.media"), number: stepNumber++ });
    steps.push({ id: "meta", label: t("admin.courts.new.steps.meta"), number: stepNumber++ });
    
    return steps;
  }, [isRootAdmin, isOrgAdmin, isClubAdmin, clubIdFromUrl, t]);
  
  const [currentStep, setCurrentStep] = useState(ALL_STEPS[0]?.id || "basic");

  const COURT_TYPES = [
    { value: "padel", label: t("admin.courts.new.types.padel") },
    { value: "tennis", label: t("admin.courts.new.types.tennis") },
    { value: "squash", label: t("admin.courts.new.types.squash") },
    { value: "badminton", label: t("admin.courts.new.types.badminton") },
    { value: "pickleball", label: t("admin.courts.new.types.pickleball") },
  ];

  const SURFACE_TYPES = [
    { value: "artificial-grass", label: t("admin.courts.new.surfaces.artificialGrass") },
    { value: "clay", label: t("admin.courts.new.surfaces.clay") },
    { value: "hard", label: t("admin.courts.new.surfaces.hard") },
    { value: "grass", label: t("admin.courts.new.surfaces.grass") },
    { value: "carpet", label: t("admin.courts.new.surfaces.carpet") },
  ];

  const SLOT_LENGTHS = [
    { value: 30, label: t("admin.courts.new.slotLengths.30") },
    { value: 60, label: t("admin.courts.new.slotLengths.60") },
    { value: 90, label: t("admin.courts.new.slotLengths.90") },
    { value: 120, label: t("admin.courts.new.slotLengths.120") },
  ];

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
  
  // Filter clubs by selected organization (for club selection step)
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

  // Initialize clubId from params (if accessing from club context)
  useEffect(() => {
    params.then((resolvedParams) => {
      setClubIdFromUrl(resolvedParams.id);
      if (resolvedParams.id) {
        setValue("clubId", resolvedParams.id);
      }
    });
  }, [params, setValue]);

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

  // Fetch club data when clubId is set
  const selectedClubId = watch("clubId") || clubIdFromUrl;
  
  useEffect(() => {
    if (!selectedClubId) {
      setLoading(false);
      return;
    }

    const fetchClub = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/clubs/${selectedClubId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError(t("admin.courts.new.errors.clubNotFound"));
            return;
          }
          throw new Error(t("admin.courts.new.errors.failedToLoadClub"));
        }
        const data = await response.json();
        setClub(data);
        
        // Set default currency from club
        if (data.defaultCurrency) {
          setValue("currency", data.defaultCurrency);
        }
        
        // Set organization ID from club if not already set
        if (data.organizationId && !getValues("organizationId")) {
          setValue("organizationId", data.organizationId);
        }
      } catch (err) {
        console.error("Failed to load club:", err);
        setError(t("admin.courts.new.errors.failedToLoadClub"));
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [selectedClubId, setValue, getValues, t]);

  // Auth check - allow any admin
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || !hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN", "CLUB_ADMIN"])) {
      router.push("/auth/sign-in");
    }
  }, [session, status, hasAnyRole, router]);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    const requiredFields = ["name"];
    const optionalFields = [
      "slug",
      "type",
      "surface",
      "shortDescription",
      "defaultPrice",
      "courtOpenTime",
      "courtCloseTime",
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
    const timeValid =
      (!watchedValues.courtOpenTime && !watchedValues.courtCloseTime) ||
      (watchedValues.courtOpenTime && watchedValues.courtCloseTime && watchedValues.courtOpenTime < watchedValues.courtCloseTime);

    return nameValid && slugValid && priceValid && timeValid;
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
        throw new Error(data.error || "Upload failed");
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
        error: "Upload failed",
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
          error: "Upload failed",
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

  // Validation per step
  const validateStep = useCallback(
    async (stepId: string): Promise<boolean> => {
      let fieldsToValidate: (keyof CourtFormData)[] = [];

      switch (stepId) {
        case "organization":
          fieldsToValidate = ["organizationId"];
          break;
        case "club":
          fieldsToValidate = ["clubId"];
          break;
        case "basic":
          fieldsToValidate = ["name", "slug"];
          break;
        case "pricing":
          fieldsToValidate = ["defaultPrice"];
          break;
        case "schedule":
          fieldsToValidate = ["courtOpenTime", "courtCloseTime"];
          break;
        case "meta":
          fieldsToValidate = ["maxPlayers"];
          break;
        default:
          break;
      }

      const result = await trigger(fieldsToValidate);
      setStepErrors((prev) => ({ ...prev, [stepId]: !result }));
      return result;
    },
    [trigger]
  );

  // Navigate to step
  const handleStepClick = async (stepId: string) => {
    // Validate current step before leaving
    await validateStep(currentStep);
    setCurrentStep(stepId);
  };

  // Submit handler
  const onSubmit = async (data: CourtFormData, visibility: "draft" | "published") => {
    const targetClubId = data.clubId || clubIdFromUrl;
    
    if (!targetClubId) {
      showToast("error", "Please select a club");
      return;
    }

    // Validate all steps
    let allValid = true;
    for (const step of ALL_STEPS) {
      const valid = await validateStep(step.id);
      if (!valid) allValid = false;
    }

    if (!allValid && visibility === "published") {
      showToast("error", "Please fix validation errors before publishing");
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
        surface: data.surface || null,
        indoor: data.indoor,
        shortDescription: data.shortDescription || null,
        defaultPriceCents: dollarsToCents(data.defaultPrice),
        defaultSlotLengthMinutes: data.defaultSlotLengthMinutes,
        courtOpenTime: data.courtOpenTime || null,
        courtCloseTime: data.courtCloseTime || null,
        mainImage: data.mainImage?.url || null,
        gallery: data.gallery
          .filter((img) => img.url && !img.error)
          .map((img) => ({ url: img.url, alt: img.alt })),
        visibility,
        tags: data.tags || null,
        maxPlayers: data.maxPlayers || null,
        notes: data.notes || null,
      };

      const response = await fetch(`/api/clubs/${targetClubId}/courts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Slug conflict
          setStepErrors((prev) => ({ ...prev, basic: true }));
          setCurrentStep("basic");
          showToast("error", `Slug already exists. Try a different slug like: ${data.slug}-1`);
          return;
        }
        throw new Error(result.error || "Failed to create court");
      }

      showToast("success", "Court created successfully!");
      
      // Redirect to admin courts list page
      setTimeout(() => {
        router.push("/admin/courts");
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create court";
      setError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case "organization":
        return renderOrganizationStep();
      case "club":
        return renderClubStep();
      case "basic":
        return renderBasicStep();
      case "pricing":
        return renderPricingStep();
      case "schedule":
        return renderScheduleStep();
      case "media":
        return renderMediaStep();
      case "meta":
        return renderMetaStep();
      default:
        return null;
    }
  };

  // Organization Selection Step
  const renderOrganizationStep = () => {
    return (
      <div className="im-create-court-step-content">
        <h2 className="im-create-court-step-title">{t("admin.courts.new.organizationStep.title")}</h2>
        <p className="im-create-court-step-description">
          {t("admin.courts.new.organizationStep.description")}
        </p>

        <div className="im-create-court-row">
          <div className="im-create-court-field im-create-court-field--full">
            <label className="im-create-court-label">{t("admin.courts.new.organizationStep.organization")} *</label>
            <select
              {...register("organizationId", {
                required: t("admin.courts.new.errors.organizationRequired"),
              })}
              className={`im-create-court-select ${errors.organizationId ? "im-create-court-input--error" : ""}`}
              disabled={isSubmitting || orgsLoading}
            >
              <option value="">{t("admin.courts.new.organizationStep.selectOrganization")}</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            {errors.organizationId && (
              <span className="im-create-court-error">{errors.organizationId.message}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Club Selection Step
  const renderClubStep = () => {
    // Club selection is only disabled during submission or loading
    // Org admins can select clubs; club admins shouldn't see this step at all
    const isDisabled = isSubmitting || clubsLoading;
    
    return (
      <div className="im-create-court-step-content">
        <h2 className="im-create-court-step-title">{t("admin.courts.new.clubStep.title")}</h2>
        <p className="im-create-court-step-description">
          {t("admin.courts.new.clubStep.description")}
        </p>

        <div className="im-create-court-row">
          <div className="im-create-court-field im-create-court-field--full">
            <label className="im-create-court-label">{t("admin.courts.new.clubStep.club")} *</label>
            <select
              {...register("clubId", {
                required: t("admin.courts.new.errors.clubRequired"),
              })}
              className={`im-create-court-select ${errors.clubId ? "im-create-court-input--error" : ""}`}
              disabled={isDisabled}
            >
              <option value="">{t("admin.courts.new.clubStep.selectClub")}</option>
              {filteredClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            {isOrgAdmin && (
              <span className="im-create-court-hint">{t("admin.courts.new.clubStep.orgAdminHint")}</span>
            )}
            {errors.clubId && (
              <span className="im-create-court-error">{errors.clubId.message}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Basic Step
  const renderBasicStep = () => (
    <div className="im-create-court-step-content">
      <h2 className="im-create-court-step-title">{t("admin.courts.new.basicStep.title")}</h2>
      <p className="im-create-court-step-description">
        {t("admin.courts.new.basicStep.description")}
      </p>

      <div className="im-create-court-row">
        <div className="im-create-court-field im-create-court-field--full">
          <label className="im-create-court-label">{t("admin.courts.new.basicStep.courtName")}</label>
          <input
            {...register("name", {
              required: t("admin.courts.new.errors.nameRequired"),
              minLength: { value: 2, message: t("admin.courts.new.errors.nameMinLength") },
              maxLength: { value: 120, message: t("admin.courts.new.errors.nameMaxLength") },
            })}
            onChange={(e) => {
              register("name").onChange(e);
              handleNameChange(e);
            }}
            className={`im-create-court-input ${errors.name ? "im-create-court-input--error" : ""}`}
            placeholder={t("admin.courts.new.basicStep.courtNamePlaceholder")}
            disabled={isSubmitting}
          />
          {errors.name && <span className="im-create-court-error">{errors.name.message}</span>}
        </div>
      </div>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.basicStep.slug")}</label>
          <input
            {...register("slug", {
              pattern: {
                value: /^[a-z0-9-]*$/,
                message: t("admin.courts.new.errors.slugPattern"),
              },
            })}
            className={`im-create-court-input ${errors.slug ? "im-create-court-input--error" : ""}`}
            placeholder={t("admin.courts.new.basicStep.slugPlaceholder")}
            disabled={isSubmitting}
          />
          <span className="im-create-court-hint">{t("admin.courts.new.basicStep.slugHint")}</span>
          {errors.slug && <span className="im-create-court-error">{errors.slug.message}</span>}
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.basicStep.courtType")}</label>
          <select
            {...register("type")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="">{t("admin.courts.new.basicStep.selectType")}</option>
            {COURT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.basicStep.surface")}</label>
          <select
            {...register("surface")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="">{t("admin.courts.new.basicStep.selectSurface")}</option>
            {SURFACE_TYPES.map((surface) => (
              <option key={surface.value} value={surface.value}>
                {surface.label}
              </option>
            ))}
          </select>
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-checkbox-wrapper">
            <input
              type="checkbox"
              {...register("indoor")}
              className="im-create-court-checkbox"
              disabled={isSubmitting}
            />
            <span className="im-create-court-checkbox-label">{t("admin.courts.new.basicStep.indoorCourt")}</span>
          </label>
        </div>
      </div>

      <div className="im-create-court-row">
        <div className="im-create-court-field im-create-court-field--full">
          <label className="im-create-court-label">{t("admin.courts.new.basicStep.shortDescription")}</label>
          <textarea
            {...register("shortDescription")}
            className="im-create-court-textarea"
            placeholder={t("admin.courts.new.basicStep.shortDescriptionPlaceholder")}
            rows={3}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );

  // Pricing Step
  const renderPricingStep = () => (
    <div className="im-create-court-step-content">
      <h2 className="im-create-court-step-title">{t("admin.courts.new.pricingStep.title")}</h2>
      <p className="im-create-court-step-description">
        {t("admin.courts.new.pricingStep.description")}
      </p>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.pricingStep.defaultPrice")}</label>
          <Controller
            name="defaultPrice"
            control={control}
            rules={{
              min: { value: 0, message: t("admin.courts.new.errors.priceNegative") },
            }}
            render={({ field }) => (
              <input
                type="number"
                step="0.01"
                min="0"
                value={field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                className={`im-create-court-input ${errors.defaultPrice ? "im-create-court-input--error" : ""}`}
                placeholder={t("admin.courts.new.pricingStep.pricePlaceholder")}
                disabled={isSubmitting}
              />
            )}
          />
          {errors.defaultPrice && (
            <span className="im-create-court-error">{errors.defaultPrice.message}</span>
          )}
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.pricingStep.currency")}</label>
          <select
            {...register("currency")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="USD">{t("admin.courts.new.currencies.usd")}</option>
            <option value="EUR">{t("admin.courts.new.currencies.eur")}</option>
            <option value="GBP">{t("admin.courts.new.currencies.gbp")}</option>
            <option value="UAH">{t("admin.courts.new.currencies.uah")}</option>
          </select>
          <span className="im-create-court-hint">{t("admin.courts.new.pricingStep.currencyHint")}</span>
        </div>
      </div>

      <div className="im-create-court-row">
        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.pricingStep.defaultSlotLength")}</label>
          <select
            {...register("defaultSlotLengthMinutes", { valueAsNumber: true })}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            {SLOT_LENGTHS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  // Schedule Step
  const renderScheduleStep = () => {
    const courtOpenTime = watch("courtOpenTime");
    const courtCloseTime = watch("courtCloseTime");
    const timeError =
      courtOpenTime && courtCloseTime && courtOpenTime >= courtCloseTime
        ? t("admin.courts.new.scheduleStep.timeError")
        : null;

    return (
      <div className="im-create-court-step-content">
        <h2 className="im-create-court-step-title">{t("admin.courts.new.scheduleStep.title")}</h2>
        <p className="im-create-court-step-description">
          {t("admin.courts.new.scheduleStep.description")}
        </p>

        <div className="im-create-court-row im-create-court-row--two">
          <div className="im-create-court-field">
            <label className="im-create-court-label">{t("admin.courts.new.scheduleStep.openTime")}</label>
            <input
              type="time"
              {...register("courtOpenTime")}
              className="im-create-court-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="im-create-court-field">
            <label className="im-create-court-label">{t("admin.courts.new.scheduleStep.closeTime")}</label>
            <input
              type="time"
              {...register("courtCloseTime")}
              className="im-create-court-input"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {timeError && (
          <div className="im-create-court-row">
            <span className="im-create-court-error">{timeError}</span>
          </div>
        )}

        <div className="im-create-court-row">
          <span className="im-create-court-hint">
            {club?.businessHours && club.businessHours.length > 0
              ? t("admin.courts.new.scheduleStep.clubHoursHint")
              : t("admin.courts.new.scheduleStep.noClubHoursHint")}
          </span>
        </div>
      </div>
    );
  };

  // Media Step
  const renderMediaStep = () => {
    const mainImage = watch("mainImage");
    const gallery = watch("gallery");

    return (
      <div className="im-create-court-step-content">
        <h2 className="im-create-court-step-title">{t("admin.courts.new.mediaStep.title")}</h2>
        <p className="im-create-court-step-description">
          {t("admin.courts.new.mediaStep.description")}
        </p>

        {/* Main Image */}
        <div className="im-create-court-row">
          <div className="im-create-court-field">
            <label className="im-create-court-label">{t("admin.courts.new.mediaStep.mainImage")}</label>
            {mainImage ? (
              <div className="im-create-court-gallery-item im-create-court-gallery-item--main" style={{ width: "150px" }}>
                {mainImage.uploading ? (
                  <div className="im-create-court-upload-progress">
                    <div className="im-create-court-spinner" />
                    <span>{t("admin.courts.new.mediaStep.uploading")}</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mainImage.preview || mainImage.url}
                      alt={mainImage.alt || `Main image for ${watchedValues.name || "new court"}`}
                      className="im-create-court-gallery-image"
                    />
                    <div className="im-create-court-gallery-actions">
                      <button
                        type="button"
                        className="im-create-court-gallery-btn"
                        onClick={handleRemoveMainImage}
                        aria-label="Remove main image"
                        disabled={isSubmitting}
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
                {mainImage.error && (
                  <span className="im-create-court-error">{mainImage.error}</span>
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
                <span>{t("admin.courts.new.mediaStep.addMainImage")}</span>
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
        </div>

        {/* Gallery */}
        <div className="im-create-court-row">
          <div className="im-create-court-field im-create-court-field--full">
            <label className="im-create-court-label">Gallery</label>
            <span className="im-create-court-hint" style={{ marginBottom: "0.5rem", display: "block" }}>
              Add additional photos. Click an image to set it as main.
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
                        alt={image.alt || `Gallery image ${index + 1} for ${watchedValues.name || "new court"}`}
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
                        aria-label={`Set gallery image ${index + 1} as main image`}
                      />
                      <div className="im-create-court-gallery-actions">
                        <button
                          type="button"
                          className="im-create-court-gallery-btn"
                          onClick={() => handleRemoveGalleryImage(index)}
                          aria-label={`Remove gallery image ${index + 1}`}
                          disabled={isSubmitting}
                        >
                          ✕
                        </button>
                      </div>
                    </>
                  )}
                  {image.error && (
                    <span className="im-create-court-error">{image.error}</span>
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
                <span>{t("admin.courts.new.mediaStep.add")}</span>
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

  // Meta Step
  const renderMetaStep = () => (
    <div className="im-create-court-step-content">
      <h2 className="im-create-court-step-title">{t("admin.courts.new.metaStep.title")}</h2>
      <p className="im-create-court-step-description">
        {t("admin.courts.new.metaStep.description")}
      </p>

      <div className="im-create-court-row">
        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.metaStep.visibility")}</label>
          <select
            {...register("visibility")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="draft">{t("admin.courts.new.metaStep.visibilityDraft")}</option>
            <option value="published">{t("admin.courts.new.metaStep.visibilityPublished")}</option>
          </select>
        </div>
      </div>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.metaStep.tags")}</label>
          <input
            {...register("tags")}
            className="im-create-court-input"
            placeholder={t("admin.courts.new.metaStep.tagsPlaceholder")}
            disabled={isSubmitting}
          />
          <span className="im-create-court-hint">{t("admin.courts.new.metaStep.tagsHint")}</span>
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-label">{t("admin.courts.new.metaStep.maxPlayers")}</label>
          <Controller
            name="maxPlayers"
            control={control}
            rules={{
              min: { value: 1, message: t("admin.courts.new.errors.maxPlayersMin") },
              max: { value: 20, message: t("admin.courts.new.errors.maxPlayersMax") },
            }}
            render={({ field }) => (
              <input
                type="number"
                min="1"
                max="20"
                value={field.value}
                onChange={(e) => field.onChange(parseInt(e.target.value) || 4)}
                className="im-create-court-input"
                disabled={isSubmitting}
              />
            )}
          />
          {errors.maxPlayers && (
            <span className="im-create-court-error">{errors.maxPlayers.message}</span>
          )}
        </div>
      </div>

      <div className="im-create-court-row">
        <div className="im-create-court-field im-create-court-field--full">
          <label className="im-create-court-label">{t("admin.courts.new.metaStep.notes")}</label>
          <textarea
            {...register("notes")}
            className="im-create-court-textarea"
            placeholder={t("admin.courts.new.metaStep.notesPlaceholder")}
            rows={3}
            disabled={isSubmitting}
          />
          <span className="im-create-court-hint">{t("admin.courts.new.metaStep.notesHint")}</span>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (status === "loading" || loading) {
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
  if (error && !club) {
    return (
      <main className="im-create-court-page">
        <div className="im-create-court-layout">
          <Card>
            <div className="im-create-court-error-banner">{error}</div>
            <div style={{ marginTop: "1rem" }}>
              <Link href="/admin/clubs">{t("admin.courts.new.actions.backToClubs")}</Link>
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

      {/* Header / Toolbar */}
      <header className="im-create-court-header">
        <div className="im-create-court-header-content">
          <Breadcrumbs
            items={
              clubIdFromUrl
                ? [
                    { label: t("breadcrumbs.admin"), href: "/admin/clubs" },
                    { label: t("breadcrumbs.clubs"), href: "/admin/clubs" },
                    { label: club?.name || t("breadcrumbs.club"), href: `/admin/clubs/${clubIdFromUrl}` },
                    { label: t("breadcrumbs.courts"), href: `/admin/clubs/${clubIdFromUrl}/courts` },
                    { label: t("admin.courts.new.title") },
                  ]
                : [
                    { label: t("breadcrumbs.admin"), href: "/admin/dashboard" },
                    { label: t("breadcrumbs.courts"), href: "/admin/courts" },
                    { label: t("admin.courts.new.title") },
                  ]
            }
            separator="/"
          />

          <div className="im-create-court-header-progress">
            <div className="im-create-court-progress-bar">
              <div
                className="im-create-court-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span>{progressPercentage}{t("admin.courts.new.progress.complete")}</span>
          </div>

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
        </div>
      </header>

      {/* Main Layout */}
      <div className="im-create-court-layout">
        {/* Left Column - Wizard */}
        <div className="im-create-court-wizard">
          {/* Step Navigation */}
          <nav className="im-create-court-steps-nav" aria-label="Form steps">
            {ALL_STEPS.map((step) => {
              const isActive = currentStep === step.id;
              const hasError = stepErrors[step.id];

              return (
                <button
                  key={step.id}
                  type="button"
                  className={`im-create-court-step-btn ${isActive ? "im-create-court-step-btn--active" : ""} ${hasError ? "im-create-court-step-btn--error" : ""}`}
                  onClick={() => handleStepClick(step.id)}
                  aria-current={isActive ? "step" : undefined}
                >
                  <span className="im-create-court-step-number">
                    {hasError ? "!" : step.number}
                  </span>
                  <span>{step.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Error Banner */}
          {error && (
            <div className="im-create-court-error-banner" role="alert">
              {error}
            </div>
          )}

          {/* Step Content */}
          <form>{renderStepContent()}</form>
        </div>

        {/* Right Column - Preview */}
        <div className={`im-create-court-preview-wrapper ${previewCollapsed ? "im-create-court-preview-wrapper--collapsed" : ""}`}>
          <button
            type="button"
            className="im-create-court-preview-toggle"
            onClick={() => setPreviewCollapsed(!previewCollapsed)}
          >
            {previewCollapsed ? "Show Preview ▼" : "Hide Preview ▲"}
          </button>

          <div className="im-create-court-preview">
            <div className="im-create-court-preview-header">
              <h3 className="im-create-court-preview-title">Preview</h3>
              <span
                className={`im-create-court-preview-status ${canPublish ? "im-create-court-preview-status--ready" : "im-create-court-preview-status--draft"}`}
              >
                {canPublish ? "Ready to publish" : "Draft"}
              </span>
            </div>

            {/* Preview Image */}
            <div className="im-create-court-preview-image">
              {previewData.mainImage?.preview || previewData.mainImage?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewData.mainImage.preview || previewData.mainImage.url}
                  alt={`Preview image for ${previewData.name || "new court"}`}
                />
              ) : (
                <div className="im-create-court-preview-placeholder">
                  <span className="im-create-court-preview-placeholder-icon">📷</span>
                  <span>Add an image</span>
                </div>
              )}
            </div>

            {/* Preview Body */}
            <div className="im-create-court-preview-body">
              <h4 className="im-create-court-preview-name">
                {previewData.name || "Court Name"}
              </h4>

              <div className="im-create-court-preview-badges">
                {previewData.indoor ? (
                  <span className="im-create-court-preview-badge im-create-court-preview-badge--indoor">
                    Indoor
                  </span>
                ) : (
                  <span className="im-create-court-preview-badge im-create-court-preview-badge--outdoor">
                    Outdoor
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
                {formatPrice(dollarsToCents(previewData.defaultPrice))} / {previewData.defaultSlotLengthMinutes} min
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
