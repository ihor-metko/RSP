"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";
import { BusinessHoursField } from "./BusinessHoursField.client";
import { UploadField } from "./UploadField.client";
import "./ClubCreationStepper.css";
import "./InlineCourtsField.css";

// Types
interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface InlineCourt {
  id: string;
  name: string;
  type: string;
  surface: string;
  indoor: boolean;
  defaultPriceCents: number;
}

interface StepperFormData {
  // Step 1: General Information
  name: string;
  slug: string;
  clubType: string;
  shortDescription: string;
  // Step 2: Contacts and Address
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  // Step 3: Business Hours
  businessHours: BusinessHour[];
  // Step 4: Courts
  courts: InlineCourt[];
  // Step 5: Gallery / Images
  logo: UploadedFile | null;
  gallery: UploadedFile[];
}

const initialBusinessHours: BusinessHour[] = [
  { dayOfWeek: 0, openTime: "09:00", closeTime: "21:00", isClosed: true },
  { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 2, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 3, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 4, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 5, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 6, openTime: "10:00", closeTime: "20:00", isClosed: false },
];

const initialFormData: StepperFormData = {
  name: "Padel Pulse Arena",
  slug: "",
  clubType: "",
  shortDescription: "Сучасний падел-клуб у центрі міста з професійними кортами і тренерською командою.",
  address: "вул. Спортивна 12, Київ",
  city: "Київ",
  postalCode: "12345",
  phone: "+380501234567",
  email: "info@padelpulsearena.ua",
  website: "https://padelpulsearena.ua",
  businessHours: initialBusinessHours,
  courts: [],
  logo: null,
  gallery: [],
};

const STEPS = [
  { id: 1, label: "General" },
  { id: 2, label: "Contacts" },
  { id: 3, label: "Hours" },
  { id: 4, label: "Courts" },
  { id: 5, label: "Gallery" },
];

const CLUB_TYPES = [
  { value: "padel", label: "Padel" },
];

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function ClubCreationStepper() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StepperFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleBusinessHoursChange = useCallback((hours: BusinessHour[]) => {
    setFormData((prev) => ({ ...prev, businessHours: hours }));
  }, []);

  const handleLogoChange = useCallback((file: UploadedFile | null) => {
    setFormData((prev) => ({ ...prev, logo: file }));
    if (fieldErrors.logo) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.logo;
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleGalleryAdd = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: UploadedFile[] = files.map((file) => ({
      url: "",
      key: "",
      file,
      preview: URL.createObjectURL(file),
    }));
    setFormData((prev) => ({ ...prev, gallery: [...prev.gallery, ...newItems] }));
  }, []);

  const handleGalleryRemove = useCallback((index: number) => {
    setFormData((prev) => {
      const item = prev.gallery[index];
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return { ...prev, gallery: prev.gallery.filter((_, i) => i !== index) };
    });
  }, []);

  // Court handlers
  const handleAddCourt = useCallback(() => {
    const newCourt: InlineCourt = {
      id: generateTempId(),
      name: "",
      type: "",
      surface: "",
      indoor: false,
      defaultPriceCents: 0,
    };
    setFormData((prev) => ({ ...prev, courts: [...prev.courts, newCourt] }));
  }, []);

  const handleRemoveCourt = useCallback((id: string) => {
    setFormData((prev) => ({ ...prev, courts: prev.courts.filter((c) => c.id !== id) }));
  }, []);

  const handleCourtChange = useCallback((id: string, field: keyof InlineCourt, value: string | boolean | number) => {
    setFormData((prev) => ({
      ...prev,
      courts: prev.courts.map((court) =>
        court.id === id ? { ...court, [field]: value } : court
      ),
    }));
  }, []);

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        errors.name = "Club name is required";
      }
    }

    // Other steps don't have required fields for this initial release
    // but we keep the validation structure for extensibility

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  const uploadFile = async (file: File): Promise<{ url: string; key: string }> => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      body: formDataUpload,
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Upload failed");
    }

    return response.json();
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Final validation
    if (!formData.name.trim()) {
      setError("Club name is required");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Upload images first
      let logoData = { url: "", key: "" };
      const galleryData: { url: string; key: string }[] = [];

      if (formData.logo?.file) {
        logoData = await uploadFile(formData.logo.file);
      } else if (formData.logo?.url) {
        logoData = { url: formData.logo.url, key: formData.logo.key };
      }

      for (const galleryItem of formData.gallery) {
        if (galleryItem.file) {
          const uploaded = await uploadFile(galleryItem.file);
          galleryData.push(uploaded);
        } else if (galleryItem.url) {
          galleryData.push({ url: galleryItem.url, key: galleryItem.key });
        }
      }

      // Prepare data for submission
      const submitData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        shortDescription: formData.shortDescription.trim() || `${formData.name} - ${formData.clubType || "Sports"} Club`,
        location: formData.address.trim() || "Address not provided",
        city: formData.city.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        logo: logoData.url || null,
        heroImage: logoData.url || null, // Use logo as hero if no hero
        gallery: galleryData,
        businessHours: formData.businessHours,
        courts: formData.courts.map((court) => ({
          name: court.name,
          type: court.type || null,
          surface: court.surface || null,
          indoor: court.indoor,
          defaultPriceCents: court.defaultPriceCents,
        })),
        tags: formData.clubType ? JSON.stringify([formData.clubType]) : null,
      };

      const response = await fetch("/api/admin/clubs/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setFieldErrors({ slug: "This slug is already in use" });
          setCurrentStep(1);
          throw new Error("Slug conflict: Please choose a different slug");
        }
        throw new Error(data.error || "Failed to create club");
      }

      showToast("success", "Club created successfully!");

      // Redirect to the club detail page
      setTimeout(() => {
        router.push(`/admin/clubs/${data.id}`);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create club";
      setError(message);
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/clubs");
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">General Information</h2>
            <p className="im-stepper-section-description">
              Enter the basic details about your club.
            </p>

            <div className="im-stepper-row">
              <div className="im-stepper-field im-stepper-field--full">
                <Input
                  label="Club Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter club name"
                  disabled={isSubmitting}
                />
                {fieldErrors.name && (
                  <span className="im-stepper-field-error">{fieldErrors.name}</span>
                )}
              </div>
            </div>

            <div className="im-stepper-row im-stepper-row--two">
              <div className="im-stepper-field">
                <Input
                  label="Slug (optional)"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="club-name-slug"
                  disabled={isSubmitting}
                />
                <span className="im-stepper-field-hint">
                  Auto-generated from name if empty
                </span>
                {fieldErrors.slug && (
                  <span className="im-stepper-field-error">{fieldErrors.slug}</span>
                )}
              </div>
              <div className="im-stepper-field">
                <label className="im-stepper-label">Club Type</label>
                <select
                  name="clubType"
                  value={formData.clubType}
                  onChange={handleInputChange}
                  className="im-stepper-select"
                  disabled={isSubmitting}
                >
                  <option value="">Select type...</option>
                  {CLUB_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="im-stepper-row">
              <div className="im-stepper-field im-stepper-field--full">
                <label className="im-stepper-label">Short Description</label>
                <textarea
                  name="shortDescription"
                  value={formData.shortDescription}
                  onChange={handleInputChange}
                  placeholder="Brief description of the club..."
                  className="im-stepper-textarea"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Contacts and Address</h2>
            <p className="im-stepper-section-description">
              Provide contact information and location details.
            </p>

            <div className="im-stepper-row">
              <div className="im-stepper-field im-stepper-field--full">
                <Input
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Street address"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="im-stepper-row im-stepper-row--two">
              <div className="im-stepper-field">
                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="City"
                  disabled={isSubmitting}
                />
              </div>
              <div className="im-stepper-field">
                <Input
                  label="Postal Code"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="Postal code"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="im-stepper-row im-stepper-row--two">
              <div className="im-stepper-field">
                <Input
                  label="Phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+1 (555) 123-4567"
                  disabled={isSubmitting}
                />
              </div>
              <div className="im-stepper-field">
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="contact@club.com"
                  disabled={isSubmitting}
                />
                {fieldErrors.email && (
                  <span className="im-stepper-field-error">{fieldErrors.email}</span>
                )}
              </div>
            </div>

            <div className="im-stepper-row">
              <div className="im-stepper-field im-stepper-field--full">
                <Input
                  label="Website"
                  name="website"
                  value={formData.website}
                  onChange={handleInputChange}
                  placeholder="https://www.club.com"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </Card>
        );

      case 3:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Club Working Hours</h2>
            <p className="im-stepper-section-description">
              Set the standard operating hours for each day of the week.
            </p>
            <BusinessHoursField
              value={formData.businessHours}
              onChange={handleBusinessHoursChange}
              disabled={isSubmitting}
            />
          </Card>
        );

      case 4:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Courts</h2>
            <p className="im-stepper-section-description">
              Add courts for your club. You can add more later from the club detail page.
            </p>

            {formData.courts.length > 0 && (
              <div className="im-inline-courts-list">
                {formData.courts.map((court, index) => (
                  <div key={court.id} className="im-inline-courts-item">
                    <div className="im-inline-courts-header">
                      <span className="im-inline-courts-number">Court {index + 1}</span>
                      <button
                        type="button"
                        className="im-inline-courts-remove"
                        onClick={() => handleRemoveCourt(court.id)}
                        disabled={isSubmitting}
                        aria-label={`Remove court ${index + 1}`}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="im-inline-courts-fields">
                      <div className="im-inline-courts-field">
                        <Input
                          label="Name"
                          value={court.name}
                          onChange={(e) => handleCourtChange(court.id, "name", e.target.value)}
                          placeholder="Court name"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="im-inline-courts-field">
                        <Input
                          label="Type"
                          value={court.type}
                          onChange={(e) => handleCourtChange(court.id, "type", e.target.value)}
                          placeholder="e.g., padel, tennis"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="im-inline-courts-field">
                        <Input
                          label="Surface"
                          value={court.surface}
                          onChange={(e) => handleCourtChange(court.id, "surface", e.target.value)}
                          placeholder="e.g., artificial, clay"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="im-inline-courts-field">
                        <Input
                          label="Default Price (cents)"
                          type="number"
                          min="0"
                          value={court.defaultPriceCents.toString()}
                          onChange={(e) => handleCourtChange(court.id, "defaultPriceCents", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="im-inline-courts-field im-inline-courts-checkbox-field">
                        <label className="im-inline-courts-checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={court.indoor}
                            onChange={(e) => handleCourtChange(court.id, "indoor", e.target.checked)}
                            disabled={isSubmitting}
                            className="im-inline-courts-checkbox"
                          />
                          <span className="im-inline-courts-checkbox-label">Indoor</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddCourt}
              disabled={isSubmitting}
              className="im-inline-courts-add"
            >
              + Add Court
            </Button>
          </Card>
        );

      case 5:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Gallery / Images</h2>
            <p className="im-stepper-section-description">
              Upload your club logo and photos.
            </p>

            <div className="im-stepper-row">
              <div className="im-stepper-field">
                <UploadField
                  label="Club Logo"
                  value={formData.logo}
                  onChange={handleLogoChange}
                  aspectRatio="square"
                  helperText="Recommended: 512x512 square image"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="im-stepper-row">
              <div className="im-stepper-field im-stepper-field--full">
                <label className="im-stepper-label">Gallery Photos</label>
                <p className="im-stepper-field-hint" style={{ marginBottom: "0.5rem" }}>
                  Add photos of your club facilities
                </p>

                <div className="im-stepper-gallery-grid">
                  {formData.gallery.map((item, index) => (
                    <div key={index} className="im-stepper-gallery-item">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.preview || item.url}
                        alt={`Gallery image ${index + 1}`}
                        className="im-stepper-gallery-image"
                      />
                      <button
                        type="button"
                        className="im-stepper-gallery-remove"
                        onClick={() => handleGalleryRemove(index)}
                        disabled={isSubmitting}
                        aria-label={`Remove gallery image ${index + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="im-stepper-gallery-add"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={isSubmitting}
                  >
                    <span className="im-stepper-gallery-add-icon">+</span>
                    <span>Add Image</span>
                  </button>
                </div>

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleGalleryAdd}
                  style={{ display: "none" }}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="im-stepper">
      {/* Header */}
      <div className="im-stepper-header">
        <div className="im-stepper-breadcrumb">
          <Link href="/admin/clubs" className="im-stepper-breadcrumb-link">
            Clubs
          </Link>
          <span className="im-stepper-breadcrumb-separator">/</span>
          <span className="im-stepper-breadcrumb-current">New Club</span>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="im-stepper-indicator">
        {STEPS.map((step, index) => (
          <div key={step.id} className="im-stepper-indicator-step-wrapper" style={{ display: "flex", alignItems: "center" }}>
            <div
              className={`im-stepper-indicator-step ${currentStep === step.id ? "im-stepper-indicator-step--active" : ""
                } ${currentStep > step.id ? "im-stepper-indicator-step--completed" : ""}`}
            >
              <span className="im-stepper-indicator-number">
                {currentStep > step.id ? "✓" : step.id}
              </span>
              <span className="im-stepper-indicator-label">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`im-stepper-indicator-line ${currentStep > step.id ? "im-stepper-indicator-line--completed" : ""
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress Text */}
      <p className="im-stepper-progress">
        Step {currentStep} of {STEPS.length}
      </p>

      {/* Error Alert */}
      {error && (
        <div className="im-stepper-error" role="alert">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="im-stepper-content">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="im-stepper-navigation">
        <div className="im-stepper-navigation-left">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
        <div className="im-stepper-navigation-right">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Club"}
            </Button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`im-stepper-toast im-stepper-toast--${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}
