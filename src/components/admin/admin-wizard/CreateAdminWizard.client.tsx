"use client";

import { useState, useCallback } from "react";
import { Button, Card } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useClubStore } from "@/stores/useClubStore";
import { SelectContextStep } from "./SelectContextStep";
import { UserDataStep } from "./UserDataStep";
import { ReviewStep } from "./ReviewStep";
import type {
  CreateAdminWizardConfig,
  AdminCreationData,
  AdminWizardErrors,
  OrganizationOption,
  ClubOption,
} from "@/types/adminWizard";
import "./CreateAdminWizard.css";

const STEPS = [
  { id: 1, label: "Select Context" },
  { id: 2, label: "User Details" },
  { id: 3, label: "Review & Confirm" },
];

interface CreateAdminWizardProps {
  config: CreateAdminWizardConfig;
}

export function CreateAdminWizard({ config }: CreateAdminWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AdminWizardErrors>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Initialize form data with defaults from config
  const [formData, setFormData] = useState<AdminCreationData>({
    organizationId: config.defaultOrgId || "",
    clubId: config.defaultClubId,
    role: config.allowedRoles[0] || "ORGANIZATION_ADMIN",
    name: "",
    email: "",
    phone: "",
  });

  // Get organizations and clubs from stores
  const organizations = useOrganizationStore((state) => state.getOrganizationsWithAutoFetch());
  const clubs = useClubStore((state) => state.fetchClubsIfNeeded());
  const isLoadingOrgs = useOrganizationStore((state) => state.loading);
  const isLoadingClubs = useClubStore((state) => state.loading);

  // Convert to options format
  const orgOptions: OrganizationOption[] = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
  }));

  const clubOptions: ClubOption[] = clubs.map(club => ({
    id: club.id,
    name: club.name,
    organizationId: club.organizationId,
  }));

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Determine editability based on config
  const isOrgEditable = config.context === "root" && !config.defaultOrgId;
  const isClubEditable = (config.context === "root" || config.context === "organization") && !config.defaultClubId;
  const isRoleEditable = config.allowedRoles.length > 1;
  const showClubSelector = config.context !== "club";

  // Update form handlers
  const handleContextChange = useCallback((data: Partial<Pick<AdminCreationData, "organizationId" | "clubId" | "role">>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear related errors
    Object.keys(data).forEach((key) => {
      if (errors[key as keyof AdminWizardErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key as keyof AdminWizardErrors];
          return newErrors;
        });
      }
    });
  }, [errors]);

  const handleUserDataChange = useCallback((data: Partial<Pick<AdminCreationData, "name" | "email" | "phone">>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Clear related errors
    Object.keys(data).forEach((key) => {
      if (errors[key as keyof AdminWizardErrors]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[key as keyof AdminWizardErrors];
          return newErrors;
        });
      }
    });
  }, [errors]);

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: AdminWizardErrors = {};

    if (step === 1) {
      // Validate context selection
      if (!formData.organizationId) {
        newErrors.organizationId = "Organization is required";
      }
      if (!formData.role) {
        newErrors.role = "Role is required";
      }
      if (formData.role === "CLUB_ADMIN" && !formData.clubId) {
        newErrors.clubId = "Club is required for Club Admin role";
      }
    } else if (step === 2) {
      // Validate user data
      if (!formData.name.trim()) {
        newErrors.name = "Name is required";
      }
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Invalid email format";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone is required";
      } else if (!/^\+?[0-9\s\-\(\)]+$/.test(formData.phone)) {
        newErrors.phone = "Invalid phone format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Final validation
    if (!formData.organizationId || !formData.role || !formData.name || !formData.email || !formData.phone) {
      setErrors({ general: "Please fill in all required fields" });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare payload based on role
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role,
        ...(formData.role === "ORGANIZATION_ADMIN"
          ? { organizationId: formData.organizationId }
          : { clubId: formData.clubId }),
      };

      const response = await fetch("/api/admin/admins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (response.status === 409) {
          if (data.field === "email") {
            setErrors({ email: data.error || "Email is already in use" });
            setCurrentStep(2); // Go back to user data step
          } else if (data.field === "phone") {
            setErrors({ phone: data.error || "Phone is already in use" });
            setCurrentStep(2);
          } else {
            setErrors({ general: data.error || "A user with this email or phone already exists" });
          }
        } else if (response.status === 403) {
          setErrors({ general: data.error || "You don't have permission to create this admin" });
        } else {
          setErrors({ general: data.error || "Failed to create admin" });
        }
        showToast("error", data.error || "Failed to create admin");
        return;
      }

      showToast("success", "Admin created successfully!");

      // Call success callback if provided
      if (config.onSuccess) {
        config.onSuccess(data.userId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create admin";
      setErrors({ general: message });
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (config.onCancel) {
      config.onCancel();
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">Select Context</h2>
            <p className="im-wizard-section-description">
              Choose the organization and role for the new admin.
            </p>
            <SelectContextStep
              data={{
                organizationId: formData.organizationId,
                clubId: formData.clubId,
                role: formData.role,
              }}
              onChange={handleContextChange}
              errors={errors}
              disabled={isSubmitting || isLoadingOrgs || isLoadingClubs}
              organizations={orgOptions}
              clubs={clubOptions}
              allowedRoles={config.allowedRoles}
              isOrgEditable={isOrgEditable}
              isClubEditable={isClubEditable}
              isRoleEditable={isRoleEditable}
              showClubSelector={showClubSelector}
            />
          </Card>
        );

      case 2:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">User Details</h2>
            <p className="im-wizard-section-description">
              Enter the admin&apos;s personal information.
            </p>
            <UserDataStep
              data={{
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
              }}
              onChange={handleUserDataChange}
              errors={errors}
              disabled={isSubmitting}
            />
          </Card>
        );

      case 3:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">Review & Confirm</h2>
            <p className="im-wizard-section-description">
              Please review the information before creating the admin.
            </p>
            <ReviewStep
              data={formData}
              organizations={orgOptions}
              clubs={clubOptions}
            />
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="im-wizard im-admin-wizard">
      {/* Step Indicator */}
      <div className="im-wizard-indicator">
        {STEPS.map((step, index) => (
          <div key={step.id} className="im-wizard-indicator-step-wrapper">
            <div
              className={`im-wizard-indicator-step ${currentStep === step.id ? "im-wizard-indicator-step--active" : ""
                } ${currentStep > step.id ? "im-wizard-indicator-step--completed" : ""}`}
            >
              <span className="im-wizard-indicator-number">
                {currentStep > step.id ? "✓" : step.id}
              </span>
              <span className="im-wizard-indicator-label">{step.label}</span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`im-wizard-indicator-line ${currentStep > step.id ? "im-wizard-indicator-line--completed" : ""
                  }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Progress Text */}
      <p className="im-wizard-progress">
        Step {currentStep} of {STEPS.length}
      </p>

      {/* Error Alert */}
      {errors.general && (
        <div className="im-wizard-error" role="alert">
          {errors.general}
        </div>
      )}

      {/* Step Content */}
      <div className="im-wizard-content">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="im-wizard-navigation">
        <div className="im-wizard-navigation-left">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
        <div className="im-wizard-navigation-right">
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
              disabled={isSubmitting || isLoadingOrgs || isLoadingClubs}
            >
              Next
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Admin"}
            </Button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`im-wizard-toast im-wizard-toast--${toast.type}`} role="alert">
          {toast.message}
        </div>
      )}
    </div>
  );
}
