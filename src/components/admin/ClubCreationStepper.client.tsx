"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useUserStore } from "@/stores/useUserStore";
import { toOrganizationOptions, toOrganizationOption } from "@/utils/organization";
import { createAddressFromForm } from "@/types/address";
import {
  GeneralInfoStep,
  ContactsStep,
  HoursStep,
  CourtsStep,
  GalleryStep,
  type GeneralInfoData,
  type ContactsData,
  type HoursData,
  type CourtsData,
  type GalleryData,
  type OrganizationOption,
} from "./steps";
import type { UploadedFile, BusinessHour, InlineCourt } from "@/types/admin";
import "./ClubCreationStepper.css";
import "./InlineCourtsField.css";
import "./steps/steps.css";

interface StepperFormData {
  // Step 1: General Information
  organizationId: string;
  name: string;
  slug: string;
  clubType: string;
  shortDescription: string;
  supportedSports: string[];
  // Step 2: Contacts and Address
  address: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
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
  organizationId: "",
  name: "Padel Pulse Arena",
  slug: "",
  clubType: "",
  shortDescription: "Сучасний падел-клуб у центрі міста з професійними кортами і тренерською командою.",
  supportedSports: [],
  address: "вул. Спортивна 12, Київ",
  city: "Київ",
  postalCode: "12345",
  country: "Ukraine",
  latitude: "50.4501",
  longitude: "30.5234",
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

export function ClubCreationStepper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("admin.clubs.stepper");
  const tNav = useTranslations("admin.clubs.stepper.navigation");
  const tErrors = useTranslations("admin.clubs.stepper.errors");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StepperFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Organization context state
  const [prefilledOrg, setPrefilledOrg] = useState<OrganizationOption | null>(null);
  
  // Get admin status from user store
  const adminStatus = useUserStore((state) => state.adminStatus);
  
  // Use Zustand store for organizations with auto-fetch
  const organizations = useOrganizationStore((state) => state.getOrganizationsWithAutoFetch());
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const isLoadingOrgs = useOrganizationStore((state) => state.loading);
  const fetchOrganizationById = useOrganizationStore((state) => state.fetchOrganizationById);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Fetch organization from URL parameter or from admin status
  useEffect(() => {
    const fetchOrgForAdmin = async () => {
      // Check if organizationId is in URL parameters (from organization detail page)
      const urlOrgId = searchParams.get("organizationId");
      
      if (urlOrgId) {
        // Prefill from URL parameter (takes precedence)
        try {
          await fetchOrganizationById(urlOrgId);
          // Don't access currentOrg here - let separate useEffect handle it
        } catch {
          // If org fetch fails, set organization ID only
          setFormData(prev => ({ ...prev, organizationId: urlOrgId }));
        }
      } else if (adminStatus?.adminType === "organization_admin" && adminStatus.managedIds.length > 0) {
        // If organization admin, fetch their organization from store
        const orgId = adminStatus.managedIds[0];
        try {
          await fetchOrganizationById(orgId);
          // Don't access currentOrg here - let separate useEffect handle it
          // This avoids race conditions and follows React's data flow patterns
        } catch {
          // If org fetch fails, set organization ID only
          setFormData(prev => ({ ...prev, organizationId: orgId }));
        }
      }
    };

    fetchOrgForAdmin();
  }, [adminStatus, fetchOrganizationById, searchParams]);

  // Update prefilledOrg when currentOrg changes
  useEffect(() => {
    const urlOrgId = searchParams.get("organizationId");
    
    if (currentOrg) {
      // If we have currentOrg loaded (either from URL or admin status)
      if (urlOrgId === currentOrg.id || (adminStatus?.adminType === "organization_admin" && !urlOrgId)) {
        const userOrg = toOrganizationOption(currentOrg);
        setPrefilledOrg(userOrg);
        setFormData(prev => ({ ...prev, organizationId: userOrg.id }));
      }
    }
  }, [currentOrg, adminStatus?.adminType, searchParams]);

  // Search organizations for root admin (use store with filtering)
  const handleOrgSearch = useCallback(async () => {
    if (adminStatus?.adminType !== "root_admin") return;
    
    // Organizations are auto-fetched by the selector
    // Client-side filtering is handled in GeneralInfoStep component
  }, [adminStatus?.adminType]);

  // Generic update handlers for step components
  const handleGeneralInfoChange = useCallback((data: Partial<GeneralInfoData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    Object.keys(data).forEach((key) => {
      if (fieldErrors[key]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    });
  }, [fieldErrors]);

  const handleContactsChange = useCallback((data: Partial<ContactsData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    Object.keys(data).forEach((key) => {
      if (fieldErrors[key]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key];
          return newErrors;
        });
      }
    });
  }, [fieldErrors]);

  const handleHoursChange = useCallback((data: Partial<HoursData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    if (data.businessHours && fieldErrors.businessHours) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.businessHours;
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleCourtsChange = useCallback((data: Partial<CourtsData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    if (data.courts && fieldErrors.courts) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.courts;
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleGalleryChange = useCallback((data: Partial<GalleryData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    if (data.logo !== undefined && fieldErrors.logo) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.logo;
        return newErrors;
      });
    }
  }, [fieldErrors]);

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      // Validate organization selection
      if (!formData.organizationId) {
        errors.organizationId = tErrors("organizationRequired");
      }
      if (!formData.name.trim()) {
        errors.name = tErrors("nameRequired");
      }
    }

    if (step === 2) {
      // Validate email format if provided
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = tErrors("invalidEmail");
      }
      // Validate latitude if provided
      if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
        errors.latitude = tErrors("invalidLatitude");
      }
      // Validate longitude if provided
      if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
        errors.longitude = tErrors("invalidLongitude");
      }
    }

    // Other steps don't have required fields for this initial release
    // but we keep the validation structure for extensibility

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, tErrors]);

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

  const uploadFile = async (clubId: string, file: File, imageType: 'logo' | 'heroImage'): Promise<{ url: string }> => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);
    formDataUpload.append("type", imageType);

    const response = await fetch(`/api/images/clubs/${clubId}/upload`, {
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
    if (!formData.organizationId) {
      setError(tErrors("organizationRequired"));
      setCurrentStep(1);
      return;
    }
    if (!formData.name.trim()) {
      setError(tErrors("nameRequired"));
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare data for submission (without images - they'll be uploaded after club creation)
      // Build Address object from form data
      const address = createAddressFromForm({
        street: formData.address,
        city: formData.city,
        postalCode: formData.postalCode, // Include postalCode from formData
        country: formData.country,
        latitude: formData.latitude,
        longitude: formData.longitude,
      });

      const submitData = {
        organizationId: formData.organizationId,
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        shortDescription: formData.shortDescription.trim() || `${formData.name} - Sports Club`,
        location: formData.address.trim() || "Address not provided", // Legacy field for backward compatibility
        address, // New Address object
        city: formData.city.trim() || null,
        country: formData.country.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        supportedSports: formData.supportedSports.length > 0 ? formData.supportedSports : undefined,
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

      // Create club first
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

      const clubId = data.id;

      // Upload images after club is created
      try {
        // Upload logo if provided
        if (formData.logo?.file) {
          await uploadFile(clubId, formData.logo.file, "logo");
        }

        // For now, we'll skip gallery uploads as they need a different approach
        // Gallery images would require a separate endpoint or multiple uploads
        // This can be implemented later if needed
      } catch (uploadErr) {
        // Club was created successfully, but image upload failed
        // This is not a critical error - user can upload images later
        console.error("Image upload failed:", uploadErr);
        const uploadMessage = uploadErr instanceof Error ? uploadErr.message : "Image upload failed";
        showToast("success", `Club created successfully! Note: ${uploadMessage}`);
        
        // Continue to redirect
        setTimeout(() => {
          router.push(`/admin/clubs/${clubId}`);
        }, 2000);
        return;
      }

      showToast("success", "Club created successfully!");

      // Redirect to the club detail page
      setTimeout(() => {
        router.push(`/admin/clubs/${clubId}`);
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
    // Build organization context for GeneralInfoStep
    // If organizationId is in URL, make it non-editable (locked to that organization)
    const urlOrgId = searchParams.get("organizationId");
    const orgContext = adminStatus ? {
      isEditable: adminStatus.adminType === "root_admin" && !urlOrgId,
      prefilledOrg: prefilledOrg,
      isLoading: isLoadingOrgs,
      organizations: toOrganizationOptions(organizations),
      onSearch: handleOrgSearch,
    } : undefined;

    switch (currentStep) {
      case 1:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("generalInfo.title")}</h2>
            <p className="im-stepper-section-description">
              {t("generalInfo.description")}
            </p>
            <GeneralInfoStep
              data={{
                organizationId: formData.organizationId,
                name: formData.name,
                slug: formData.slug,
                clubType: formData.clubType,
                shortDescription: formData.shortDescription,
                supportedSports: formData.supportedSports,
              }}
              onChange={handleGeneralInfoChange}
              errors={fieldErrors}
              disabled={isSubmitting}
              organizationContext={orgContext}
            />
          </Card>
        );

      case 2:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("contacts.title")}</h2>
            <p className="im-stepper-section-description">
              {t("contacts.description")}
            </p>
            <ContactsStep
              data={{
                address: formData.address,
                city: formData.city,
                postalCode: formData.postalCode,
                country: formData.country,
                latitude: formData.latitude,
                longitude: formData.longitude,
                phone: formData.phone,
                email: formData.email,
                website: formData.website,
              }}
              onChange={handleContactsChange}
              errors={fieldErrors}
              disabled={isSubmitting}
            />
          </Card>
        );

      case 3:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("hours.title")}</h2>
            <p className="im-stepper-section-description">
              {t("hours.description")}
            </p>
            <HoursStep
              data={{ businessHours: formData.businessHours }}
              onChange={handleHoursChange}
              errors={fieldErrors}
              disabled={isSubmitting}
            />
          </Card>
        );

      case 4:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("courts.title")}</h2>
            <p className="im-stepper-section-description">
              {t("courts.description")}
            </p>
            <CourtsStep
              data={{ courts: formData.courts }}
              onChange={handleCourtsChange}
              errors={fieldErrors}
              disabled={isSubmitting}
            />
          </Card>
        );

      case 5:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("gallery.title")}</h2>
            <p className="im-stepper-section-description">
              {t("gallery.description")}
            </p>
            <GalleryStep
              data={{ logo: formData.logo, gallery: formData.gallery }}
              onChange={handleGalleryChange}
              errors={fieldErrors}
              disabled={isSubmitting}
            />
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="im-stepper">
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
              <span className="im-stepper-indicator-label">{t(`steps.${step.label.toLowerCase()}`)}</span>
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
        {t("stepOf", { current: currentStep, total: STEPS.length })}
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
            {tNav("cancel")}
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
              {tNav("back")}
            </Button>
          )}
          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
            >
              {tNav("next")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? tNav("creating") : tNav("createClub")}
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
