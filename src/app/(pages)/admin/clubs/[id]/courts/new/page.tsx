"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { Button, Card, Breadcrumbs } from "@/components/ui";
import { formatPrice, dollarsToCents } from "@/utils/price";
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
  defaultCurrency?: string;
  businessHours?: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>;
}

const STEPS = [
  { id: "basic", label: "Basic", number: 1 },
  { id: "pricing", label: "Pricing", number: 2 },
  { id: "schedule", label: "Schedule", number: 3 },
  { id: "media", label: "Media", number: 4 },
  { id: "meta", label: "Meta", number: 5 },
];

const COURT_TYPES = [
  { value: "padel", label: "Padel" },
  { value: "tennis", label: "Tennis" },
  { value: "squash", label: "Squash" },
  { value: "badminton", label: "Badminton" },
  { value: "pickleball", label: "Pickleball" },
];

const SURFACE_TYPES = [
  { value: "artificial-grass", label: "Artificial Grass" },
  { value: "clay", label: "Clay" },
  { value: "hard", label: "Hard" },
  { value: "grass", label: "Grass" },
  { value: "carpet", label: "Carpet" },
];

const SLOT_LENGTHS = [
  { value: 30, label: "30 minutes" },
  { value: 60, label: "60 minutes" },
  { value: 90, label: "90 minutes" },
  { value: 120, label: "120 minutes" },
];

const defaultFormValues: CourtFormData = {
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubId, setClubId] = useState<string | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState("basic");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewCollapsed, setPreviewCollapsed] = useState(true);
  const [stepErrors, setStepErrors] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

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

  // Debounced preview values
  const [previewData, setPreviewData] = useState<CourtFormData>(defaultFormValues);

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

  // Initialize clubId from params
  useEffect(() => {
    params.then((resolvedParams) => {
      setClubId(resolvedParams.id);
    });
  }, [params]);

  // Fetch club data
  useEffect(() => {
    if (!clubId) return;

    const fetchClub = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/clubs/${clubId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Club not found");
            return;
          }
          throw new Error("Failed to fetch club");
        }
        const data = await response.json();
        setClub(data);
        
        // Set default currency from club
        if (data.defaultCurrency) {
          setValue("currency", data.defaultCurrency);
        }
      } catch (err) {
        console.error("Failed to load club:", err);
        setError("Failed to load club");
      } finally {
        setLoading(false);
      }
    };

    fetchClub();
  }, [clubId, setValue]);

  // Auth check
  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/sign-in");
    }
  }, [session, status, router]);

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
    if (!clubId) return;

    // Validate all steps
    let allValid = true;
    for (const step of STEPS) {
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

      const response = await fetch(`/api/clubs/${clubId}/courts`, {
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
      
      // Redirect to courts list page
      setTimeout(() => {
        router.push(`/admin/clubs/${clubId}/courts`);
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

  // Basic Step
  const renderBasicStep = () => (
    <div className="im-create-court-step-content">
      <h2 className="im-create-court-step-title">Basic Information</h2>
      <p className="im-create-court-step-description">
        Enter the basic details about your court.
      </p>

      <div className="im-create-court-row">
        <div className="im-create-court-field im-create-court-field--full">
          <label className="im-create-court-label">Court Name *</label>
          <input
            {...register("name", {
              required: "Name is required",
              minLength: { value: 2, message: "Name must be at least 2 characters" },
              maxLength: { value: 120, message: "Name must be at most 120 characters" },
            })}
            onChange={(e) => {
              register("name").onChange(e);
              handleNameChange(e);
            }}
            className={`im-create-court-input ${errors.name ? "im-create-court-input--error" : ""}`}
            placeholder="Enter court name"
            disabled={isSubmitting}
          />
          {errors.name && <span className="im-create-court-error">{errors.name.message}</span>}
        </div>
      </div>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">Slug (optional)</label>
          <input
            {...register("slug", {
              pattern: {
                value: /^[a-z0-9-]*$/,
                message: "Slug can only contain lowercase letters, numbers, and hyphens",
              },
            })}
            className={`im-create-court-input ${errors.slug ? "im-create-court-input--error" : ""}`}
            placeholder="court-name-slug"
            disabled={isSubmitting}
          />
          <span className="im-create-court-hint">Auto-generated from name if empty</span>
          {errors.slug && <span className="im-create-court-error">{errors.slug.message}</span>}
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-label">Court Type</label>
          <select
            {...register("type")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="">Select type...</option>
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
          <label className="im-create-court-label">Surface</label>
          <select
            {...register("surface")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="">Select surface...</option>
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
            <span className="im-create-court-checkbox-label">Indoor Court</span>
          </label>
        </div>
      </div>

      <div className="im-create-court-row">
        <div className="im-create-court-field im-create-court-field--full">
          <label className="im-create-court-label">Short Description</label>
          <textarea
            {...register("shortDescription")}
            className="im-create-court-textarea"
            placeholder="Brief description of the court..."
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
      <h2 className="im-create-court-step-title">Pricing</h2>
      <p className="im-create-court-step-description">
        Set the default pricing for this court.
      </p>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">Default Price</label>
          <Controller
            name="defaultPrice"
            control={control}
            rules={{
              min: { value: 0, message: "Price cannot be negative" },
            }}
            render={({ field }) => (
              <input
                type="number"
                step="0.01"
                min="0"
                value={field.value}
                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                className={`im-create-court-input ${errors.defaultPrice ? "im-create-court-input--error" : ""}`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
            )}
          />
          {errors.defaultPrice && (
            <span className="im-create-court-error">{errors.defaultPrice.message}</span>
          )}
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-label">Currency</label>
          <select
            {...register("currency")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
            <option value="UAH">UAH (₴)</option>
          </select>
          <span className="im-create-court-hint">Defaults to club currency</span>
        </div>
      </div>

      <div className="im-create-court-row">
        <div className="im-create-court-field">
          <label className="im-create-court-label">Default Slot Length</label>
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
        ? "Open time must be before close time"
        : null;

    return (
      <div className="im-create-court-step-content">
        <h2 className="im-create-court-step-title">Schedule</h2>
        <p className="im-create-court-step-description">
          Set court-specific operating hours. Leave empty to use club hours.
        </p>

        <div className="im-create-court-row im-create-court-row--two">
          <div className="im-create-court-field">
            <label className="im-create-court-label">Open Time</label>
            <input
              type="time"
              {...register("courtOpenTime")}
              className="im-create-court-input"
              disabled={isSubmitting}
            />
          </div>

          <div className="im-create-court-field">
            <label className="im-create-court-label">Close Time</label>
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
              ? "Club hours will be used if not specified here."
              : "No club hours configured. Court hours are recommended."}
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
        <h2 className="im-create-court-step-title">Media</h2>
        <p className="im-create-court-step-description">
          Upload images for this court. The main image will be shown as the primary photo.
        </p>

        {/* Main Image */}
        <div className="im-create-court-row">
          <div className="im-create-court-field">
            <label className="im-create-court-label">Main Image</label>
            {mainImage ? (
              <div className="im-create-court-gallery-item im-create-court-gallery-item--main" style={{ width: "150px" }}>
                {mainImage.uploading ? (
                  <div className="im-create-court-upload-progress">
                    <div className="im-create-court-spinner" />
                    <span>Uploading...</span>
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
                <span>Add Main Image</span>
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
                <span>Add</span>
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
      <h2 className="im-create-court-step-title">Additional Settings</h2>
      <p className="im-create-court-step-description">
        Configure visibility and additional options.
      </p>

      <div className="im-create-court-row">
        <div className="im-create-court-field">
          <label className="im-create-court-label">Visibility</label>
          <select
            {...register("visibility")}
            className="im-create-court-select"
            disabled={isSubmitting}
          >
            <option value="draft">Draft (not visible to public)</option>
            <option value="published">Published (visible to public)</option>
          </select>
        </div>
      </div>

      <div className="im-create-court-row im-create-court-row--two">
        <div className="im-create-court-field">
          <label className="im-create-court-label">Tags</label>
          <input
            {...register("tags")}
            className="im-create-court-input"
            placeholder="e.g., beginner-friendly, tournament"
            disabled={isSubmitting}
          />
          <span className="im-create-court-hint">Comma-separated tags</span>
        </div>

        <div className="im-create-court-field">
          <label className="im-create-court-label">Max Players</label>
          <Controller
            name="maxPlayers"
            control={control}
            rules={{
              min: { value: 1, message: "Must be at least 1" },
              max: { value: 20, message: "Cannot exceed 20" },
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
          <label className="im-create-court-label">Notes</label>
          <textarea
            {...register("notes")}
            className="im-create-court-textarea"
            placeholder="Additional notes or instructions..."
            rows={3}
            disabled={isSubmitting}
          />
          <span className="im-create-court-hint">Internal notes, not shown to public</span>
        </div>
      </div>
    </div>
  );

  // Loading state
  if (status === "loading" || loading) {
    return (
      <main className="im-create-court-page">
        <div className="im-create-court-layout">
          <Card>
            <div style={{ textAlign: "center", padding: "2rem" }}>Loading...</div>
          </Card>
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
              <Link href="/admin/clubs">← Back to Clubs</Link>
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
            <span className="im-create-court-submitting-text">Creating court...</span>
          </div>
        </div>
      )}

      {/* Header / Toolbar */}
      <header className="im-create-court-header">
        <div className="im-create-court-header-content">
          <Breadcrumbs
            items={[
              { label: "Admin", href: "/admin/clubs" },
              { label: "Clubs", href: "/admin/clubs" },
              { label: club?.name || "Club", href: `/admin/clubs/${clubId}` },
              { label: "Courts", href: `/admin/clubs/${clubId}/courts` },
              { label: "New Court" },
            ]}
            separator="/"
          />

          <div className="im-create-court-header-progress">
            <div className="im-create-court-progress-bar">
              <div
                className="im-create-court-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span>{progressPercentage}% complete</span>
          </div>

          <div className="im-create-court-header-actions">
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit((data) => onSubmit(data, "draft"))}
              disabled={isSubmitting}
            >
              Save Draft
            </Button>
            <Button
              type="button"
              onClick={handleSubmit((data) => onSubmit(data, "published"))}
              disabled={isSubmitting || !canPublish}
            >
              Save &amp; Publish
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
            {STEPS.map((step) => {
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
