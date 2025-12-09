"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useUserStore } from "@/stores/useUserStore";
import { toOrganizationOptions, toOrganizationOption } from "@/utils/organization";
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
  organizationId: "",
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

export function ClubCreationStepper() {
  const router = useRouter();
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

  // Fetch organization for organization admin on mount
  useEffect(() => {
    const fetchOrgForAdmin = async () => {
      // If organization admin, fetch their organization from store
      if (adminStatus?.adminType === "organization_admin" && adminStatus.managedIds.length > 0) {
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
  }, [adminStatus, fetchOrganizationById]);

  // Update prefilledOrg when currentOrg changes (for organization admin)
  useEffect(() => {
    if (currentOrg && adminStatus?.adminType === "organization_admin") {
      const userOrg = toOrganizationOption(currentOrg);
      setPrefilledOrg(userOrg);
      setFormData(prev => ({ ...prev, organizationId: userOrg.id }));
    }
  }, [currentOrg, adminStatus?.adminType]);

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
        errors.organizationId = "Organization is required";
      }
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
    if (!formData.organizationId) {
      setError("Organization is required");
      setCurrentStep(1);
      return;
    }
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
        organizationId: formData.organizationId,
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
    // Build organization context for GeneralInfoStep
    const orgContext = adminStatus ? {
      isEditable: adminStatus.adminType === "root_admin",
      prefilledOrg: prefilledOrg,
      isLoading: isLoadingOrgs,
      organizations: toOrganizationOptions(organizations),
      onSearch: handleOrgSearch,
    } : undefined;

    switch (currentStep) {
      case 1:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">General Information</h2>
            <p className="im-stepper-section-description">
              Enter the basic details about your club.
            </p>
            <GeneralInfoStep
              data={{
                organizationId: formData.organizationId,
                name: formData.name,
                slug: formData.slug,
                clubType: formData.clubType,
                shortDescription: formData.shortDescription,
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
            <h2 className="im-stepper-section-title">Contacts and Address</h2>
            <p className="im-stepper-section-description">
              Provide contact information and location details.
            </p>
            <ContactsStep
              data={{
                address: formData.address,
                city: formData.city,
                postalCode: formData.postalCode,
                country: "",
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
            <h2 className="im-stepper-section-title">Club Working Hours</h2>
            <p className="im-stepper-section-description">
              Set the standard operating hours for each day of the week.
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
            <h2 className="im-stepper-section-title">Courts</h2>
            <p className="im-stepper-section-description">
              Add courts for your club. You can add more later from the club detail page.
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
            <h2 className="im-stepper-section-title">Gallery / Images</h2>
            <p className="im-stepper-section-description">
              Upload your club logo and photos.
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
