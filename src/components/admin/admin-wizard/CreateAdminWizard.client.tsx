"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Card } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { useAdminClubStore } from "@/stores/useAdminClubStore";
import { useAdminUsersStore } from "@/stores/useAdminUsersStore";
import { SelectContextStep } from "./SelectContextStep";
import { ExistingUserSearchStep } from "./ExistingUserSearchStep";
import { ReviewStep } from "./ReviewStep";
import type {
  CreateAdminWizardConfig,
  AdminCreationData,
  AdminWizardErrors,
  OrganizationOption,
  ClubOption,
} from "@/types/adminWizard";
import "./CreateAdminWizard.css";

interface CreateAdminWizardProps {
  config: CreateAdminWizardConfig;
}

// Type definitions for API responses
interface ErrorResponse {
  error?: string;
  field?: string;
  existingInviteId?: string;
}

interface SuccessResponse {
  userId?: string;
  invite?: { id: string };
}

export function CreateAdminWizard({ config }: CreateAdminWizardProps) {
  const t = useTranslations("createAdminWizard");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AdminWizardErrors>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const STEPS = [
    { id: 1, label: t("steps.contextRole") },
    { id: 2, label: t("steps.userDetails") },
    { id: 3, label: t("steps.confirm") },
  ];

  // Initialize form data with defaults from config
  // MVP: userSource is always "existing" - we only work with existing users
  const [formData, setFormData] = useState<AdminCreationData>({
    organizationId: config.defaultOrgId || "",
    clubId: config.defaultClubId,
    role: config.allowedRoles[0] || "ORGANIZATION_ADMIN",
    userSource: "existing",
  });

  // Get organizations and clubs from stores
  // Only fetch organizations when in root context and no organization data is pre-provided
  const shouldFetchOrganizations = config.context === "root" && !config.organizationData;
  const storeOrganizations = useOrganizationStore((state) => 
    shouldFetchOrganizations ? state.getOrganizationsWithAutoFetch() : state.organizations
  );
  const clubs = useAdminClubStore((state) => state.clubs);
  const fetchClubsIfNeeded = useAdminClubStore((state) => state.fetchClubsIfNeeded);
  const isLoadingOrgs = useOrganizationStore((state) => state.loading);
  const isLoadingClubs = useAdminClubStore((state) => state.loadingClubs);
  
  // Get admin users store actions for refreshing data after success
  const refetchAdminUsers = useAdminUsersStore((state) => state.refetch);

  // When club context, fetch clubs only if club data is not pre-provided
  // This is only triggered when the modal is opened in club context without pre-populated data
  useEffect(() => {
    if (config.context === "club" && config.defaultClubId && !config.clubData) {
      // Fetch clubs only when in club context and club data is not provided
      fetchClubsIfNeeded().catch((error) => {
        console.error("Failed to fetch clubs:", error);
      });
    }
  }, [config.context, config.defaultClubId, config.clubData, fetchClubsIfNeeded]);

  // Set organization from club when clubs are loaded in club context (only if not pre-provided)
  useEffect(() => {
    if (config.context === "club" && config.defaultClubId) {
      // If club data is pre-provided, use it directly
      const clubOrgId = config.clubData?.organizationId;
      if (clubOrgId) {
        setFormData(prev => ({
          ...prev,
          organizationId: clubOrgId,
        }));
      } else if (clubs.length > 0) {
        // Otherwise, get from fetched clubs
        const club = clubs.find(c => c.id === config.defaultClubId);
        if (club?.organizationId) {
          setFormData(prev => ({
            ...prev,
            organizationId: club.organizationId,
          }));
        }
      }
    }
  }, [config.context, config.defaultClubId, config.clubData, clubs]);

  // Convert to options format
  // Use pre-provided organization data when available to avoid unnecessary fetching
  const orgOptions: OrganizationOption[] = config.organizationData
    ? [config.organizationData]
    : // Safety: storeOrganizations should always be an array, but fallback for test mocks
      (storeOrganizations || []).map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
      }));

  // Map clubs to options, preserving organizationId for filtering
  // The organizationId is used in SelectContextStep to filter clubs by selected organization
  // Use pre-provided club data when available
  const clubOptions: ClubOption[] = config.clubData
    ? [config.clubData]
    : clubs.map(club => ({
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
    
    // Fetch clubs only when a club-level role is selected
    // This ensures clubs are loaded on-demand and not for organization-level admin creation
    if (data.role && (data.role === "CLUB_ADMIN" || data.role === "CLUB_OWNER")) {
      fetchClubsIfNeeded().catch((error) => {
        console.error("Failed to fetch clubs:", error);
      });
    }
    
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
  }, [errors, fetchClubsIfNeeded]);

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
        newErrors.organizationId = t("errors.organizationRequired");
      }
      if (!formData.role) {
        newErrors.role = t("errors.roleRequired");
      }
      if ((formData.role === "CLUB_ADMIN" || formData.role === "CLUB_OWNER") && !formData.clubId) {
        newErrors.clubId = t("errors.clubRequired");
      }
    } else if (step === 2) {
      // MVP: Only validate existing user selection
      if (!formData.userId) {
        newErrors.userId = t("errors.userRequired");
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, validateStep, STEPS.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      // Clear submit error when going back
      setSubmitError(null);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    // Validate final step (confirmation)
    if (!validateStep(STEPS.length)) {
      return;
    }

    // MVP: Only handle existing users
    if (!formData.organizationId || !formData.role || !formData.userId) {
      setErrors({ general: t("errors.allFieldsRequired") });
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSubmitError(null);

    try {
      // Existing user: direct role assignment
      const payload: Record<string, unknown> = {
        role: formData.role,
        userSource: formData.userSource,
        userId: formData.userId,
      };

      // Add context (org or club)
      if (formData.role === "ORGANIZATION_OWNER" || formData.role === "ORGANIZATION_ADMIN") {
        payload.organizationId = formData.organizationId;
      } else {
        payload.clubId = formData.clubId;
      }

      const response = await fetch("/api/admin/admins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        const errorData = (typeof data === 'object' && data !== null) 
          ? data as ErrorResponse 
          : { error: 'Unknown error' };
        
        handleApiError(response, errorData);
        return;
      }

      // Success!
      const responseData = (typeof data === 'object' && data !== null)
        ? data as SuccessResponse
        : {};
      
      await handleApiSuccess(responseData);
    } catch (err) {
      // Network error or other unexpected error
      const message = err instanceof Error ? err.message : t("errors.createFailed");
      setSubmitError(message);
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

  // Helper function for handling API errors
  const handleApiError = useCallback((
    response: Response,
    errorData: ErrorResponse
  ) => {
    if (response.status === 409) {
      if (errorData.field === "owner") {
        const errorMessage = errorData.error || t("errors.ownerExists");
        setSubmitError(errorMessage);
        showToast("error", errorMessage);
      } else {
        const conflictMessage = errorData.error || t("errors.conflictOccurred");
        setSubmitError(conflictMessage);
        showToast("error", conflictMessage);
      }
    } else if (response.status === 403) {
      // Permission denied - show clear error message
      const permissionMessage = errorData.error || t("errors.permissionDenied");
      setSubmitError(permissionMessage);
      showToast("error", permissionMessage);
    } else {
      const errorMessage = errorData.error || t("errors.createFailed");
      setSubmitError(errorMessage);
      showToast("error", errorMessage);
    }
  }, [t, showToast]);

  // Helper function for handling successful API response
  const handleApiSuccess = useCallback(async (responseData: SuccessResponse) => {
    // Success! Show toast notification
    // MVP: Always show success message for existing user assignment
    const successMessage = t("messages.successExisting");
    
    showToast("success", successMessage);

    // Refresh admin users store to show newly added users
    try {
      await refetchAdminUsers();
    } catch (refreshError) {
      // Log but don't fail - the user was created successfully
      console.error("Failed to refresh admin users:", refreshError);
    }

    // Call success callback if provided (this will close the modal)
    if (config.onSuccess) {
      // For existing users, we get userId directly
      const resultId = responseData.userId;
      
      // Always call the callback to close the modal
      // Pass empty string if no specific ID is available (operation still succeeded)
      config.onSuccess(resultId || "");
    }
  }, [t, showToast, refetchAdminUsers, config]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">{t("contextStep.title")}</h2>
            <p className="im-wizard-section-description">
              {t("contextStep.description")}
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
            <h2 className="im-wizard-section-title">{t("userDataStep.title")}</h2>
            <p className="im-wizard-section-description">
              {t("userDataStep.descriptionExisting")}
            </p>
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
          </Card>
        );

      case 3:
        return (
          <Card className="im-wizard-section">
            <h2 className="im-wizard-section-title">{t("confirmStep.title")}</h2>
            <p className="im-wizard-section-description">
              {t("confirmStep.description")}
            </p>
            <ReviewStep
              data={formData}
              organizations={orgOptions}
              clubs={clubOptions}
            />
            {submitError && (
              <div className="im-wizard-error im-submit-error" role="alert">
                {submitError}
              </div>
            )}
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
        {t("progress", { current: currentStep, total: STEPS.length })}
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
            {t("navigation.cancel")}
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
              {t("navigation.back")}
            </Button>
          )}
          {currentStep < STEPS.length && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || isLoadingOrgs || isLoadingClubs}
            >
              {t("navigation.next")}
            </Button>
          )}
          {currentStep === STEPS.length && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("navigation.processing") : t("navigation.assignRole")}
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
