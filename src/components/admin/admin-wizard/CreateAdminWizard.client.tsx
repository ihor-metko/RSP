"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { SelectContextStep } from "./SelectContextStep";
import { UserSourceStep } from "./UserSourceStep";
import { ExistingUserSearchStep } from "./ExistingUserSearchStep";
import { UserDataStep } from "./UserDataStep";
import { ReviewStep } from "./ReviewStep";
import { ConfirmStep } from "./ConfirmStep";
import type {
  CreateAdminWizardConfig,
  AdminCreationData,
  AdminWizardErrors,
  OrganizationOption,
  ClubOption,
} from "@/types/adminWizard";
import "./CreateAdminWizard.css";

const STEPS = [
  { id: 1, label: "Context & Role" },
  { id: 2, label: "User Source" },
  { id: 3, label: "User Details" },
  { id: 4, label: "Review" },
  { id: 5, label: "Confirm" },
];

interface CreateAdminWizardProps {
  config: CreateAdminWizardConfig;
}

export function CreateAdminWizard({ config }: CreateAdminWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AdminWizardErrors>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");

  // Initialize form data with defaults from config
  const [formData, setFormData] = useState<AdminCreationData>({
    organizationId: config.defaultOrgId || "",
    clubId: config.defaultClubId,
    role: config.allowedRoles[0] || "ORGANIZATION_ADMIN",
    userSource: "new",
  });

  // Get organizations and clubs from stores
  const organizations = useOrganizationStore((state) => state.getOrganizationsWithAutoFetch());
  const clubs = useAdminClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);
  const isLoadingOrgs = useOrganizationStore((state) => state.loading);
  const isLoadingClubs = useAdminClubStore((state) => state.loadingClubs);

  // Fetch clubs on mount to ensure the dropdown has data
  // This is required for the Club dropdown to be populated when creating a Club Admin
  useEffect(() => {
    fetchClubsIfNeeded().catch((error) => {
      console.error("Failed to fetch clubs:", error);
    });
  }, [fetchClubsIfNeeded]);

  // Convert to options format
  const orgOptions: OrganizationOption[] = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
  }));

  // Map clubs to options, preserving organizationId for filtering
  // The organizationId is used in SelectContextStep to filter clubs by selected organization
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

  const handleUserSourceChange = useCallback((data: Partial<Pick<AdminCreationData, "userSource">>) => {
    setFormData((prev) => ({ 
      ...prev, 
      ...data,
      // Clear user-related fields when changing source
      userId: undefined,
      name: undefined,
      email: undefined,
      phone: undefined,
    }));
    // Clear related errors
    setErrors({});
  }, []);

  const handleUserDataChange = useCallback((data: Partial<Pick<AdminCreationData, "name" | "email" | "phone" | "userId">>) => {
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
      // Validate context & role selection
      if (!formData.organizationId) {
        newErrors.organizationId = "Organization is required";
      }
      if (!formData.role) {
        newErrors.role = "Role is required";
      }
      if ((formData.role === "CLUB_ADMIN" || formData.role === "CLUB_OWNER") && !formData.clubId) {
        newErrors.clubId = "Club is required for Club roles";
      }
    } else if (step === 2) {
      // Validate user source
      if (!formData.userSource) {
        newErrors.userSource = "Please select how to add the user";
      }
    } else if (step === 3) {
      // Validate user details based on source
      if (formData.userSource === "existing") {
        if (!formData.userId) {
          newErrors.userId = "Please select an existing user";
        }
      } else {
        // New user validation
        if (!formData.name || !formData.name.trim()) {
          newErrors.name = "Name is required";
        }
        if (!formData.email || !formData.email.trim()) {
          newErrors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = "Invalid email format";
        }
        if (!formData.phone || !formData.phone.trim()) {
          newErrors.phone = "Phone is required";
        } else if (!/^\+?[0-9\s\-\(\)]+$/.test(formData.phone)) {
          newErrors.phone = "Invalid phone format";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) { // Changed to -1 because step 5 is confirm, not a navigation step
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1 && currentStep < STEPS.length) { // Can't go back from confirm step
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    // Validate step 4 (Review)
    if (!validateStep(4)) {
      return;
    }

    // Final validation based on user source
    if (formData.userSource === "existing") {
      if (!formData.organizationId || !formData.role || !formData.userId) {
        setErrors({ general: "Please complete all required fields" });
        return;
      }
    } else {
      if (!formData.organizationId || !formData.role || !formData.name || !formData.email || !formData.phone) {
        setErrors({ general: "Please complete all required fields" });
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Prepare payload based on user source and role
      const payload: Record<string, unknown> = {
        role: formData.role,
        userSource: formData.userSource,
      };

      // Add context (org or club)
      if (formData.role === "ORGANIZATION_OWNER" || formData.role === "ORGANIZATION_ADMIN") {
        payload.organizationId = formData.organizationId;
      } else {
        payload.clubId = formData.clubId;
      }

      // Add user data based on source
      if (formData.userSource === "existing") {
        payload.userId = formData.userId;
      } else {
        payload.name = formData.name?.trim();
        payload.email = formData.email?.trim().toLowerCase();
        payload.phone = formData.phone?.trim();
      }

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
            setCurrentStep(3); // Go back to user details step
          } else if (data.field === "phone") {
            setErrors({ phone: data.error || "Phone is already in use" });
            setCurrentStep(3);
          } else if (data.field === "owner") {
            setErrors({ general: data.error || "An owner already exists" });
          } else {
            setErrors({ general: data.error || "A conflict occurred" });
          }
          }
        } else if (response.status === 403) {
          setErrors({ general: data.error || "You don't have permission to create this admin" });
        } else {
          setErrors({ general: data.error || "Failed to create admin" });
        }
        showToast("error", data.error || "Failed to create admin");
        setConfirmSuccess(false);
        setConfirmMessage(data.error || "Failed to create admin");
        setCurrentStep(5); // Move to confirm step to show error
        return;
      }

      // Success! Move to confirm step
      setConfirmSuccess(true);
      setConfirmMessage(
        formData.userSource === "existing"
          ? "Role assigned successfully!"
          : "Admin created successfully! An invitation email will be sent."
      );
      setCurrentStep(5);
      showToast("success", "Operation completed successfully!");

      // Call success callback after a short delay
      setTimeout(() => {
        if (config.onSuccess) {
          config.onSuccess(data.userId);
        }
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create admin";
      setErrors({ general: message });
      showToast("error", message);
      setConfirmSuccess(false);
      setConfirmMessage(message);
      setCurrentStep(5);
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
            <h2 className="im-wizard-section-title">Context & Role Selection</h2>
            <p className="im-wizard-section-description">
              Choose the organization, club (if applicable), and role for the admin.
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
            <h2 className="im-wizard-section-title">User Source Selection</h2>
            <p className="im-wizard-section-description">
              Choose whether to assign a role to an existing user or create a new user.
            </p>
            <UserSourceStep
              data={{ userSource: formData.userSource }}
              onChange={handleUserSourceChange}
              errors={errors}
              disabled={isSubmitting}
            />
          </Card>
        );

      case 3:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">User Details</h2>
            <p className="im-wizard-section-description">
              {formData.userSource === "existing"
                ? "Search for and select an existing user."
                : "Enter the new user's information."}
            </p>
            {formData.userSource === "existing" ? (
              <ExistingUserSearchStep
                data={{
                  userId: formData.userId,
                  email: formData.email,
                  name: formData.name,
                }}
                onChange={handleUserDataChange}
                errors={errors}
                disabled={isSubmitting}
              />
            ) : (
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
            )}
          </Card>
        );

      case 4:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">Review & Confirm</h2>
            <p className="im-wizard-section-description">
              Please review the information before proceeding.
            </p>
            <ReviewStep
              data={formData}
              organizations={orgOptions}
              clubs={clubOptions}
            />
          </Card>
        );

      case 5:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">
              {confirmSuccess ? "Success" : "Error"}
            </h2>
            <ConfirmStep success={confirmSuccess} message={confirmMessage} />
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
          {currentStep < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          {currentStep === 5 && (
            <Button
              type="button"
              onClick={handleCancel}
            >
              Close
            </Button>
          )}
        </div>
        <div className="im-wizard-navigation-right">
          {currentStep > 1 && currentStep < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              Back
            </Button>
          )}
          {currentStep < 4 && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || isLoadingOrgs || isLoadingClubs}
            >
              Next
            </Button>
          )}
          {currentStep === 4 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Processing..." : formData.userSource === "existing" ? "Assign Role" : "Create Admin"}
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
