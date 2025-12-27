"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
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

interface CreateAdminWizardProps {
  config: CreateAdminWizardConfig;
}

export function CreateAdminWizard({ config }: CreateAdminWizardProps) {
  const t = useTranslations("createAdminWizard");
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<AdminWizardErrors>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  
  const STEPS = [
    { id: 1, label: t("steps.contextRole") },
    { id: 2, label: t("steps.userSource") },
    { id: 3, label: t("steps.userDetails") },
    { id: 4, label: t("steps.review") },
    { id: 5, label: t("steps.confirm") },
  ];

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

  // When club context, set organization from club
  useEffect(() => {
    if (config.context === "club" && config.defaultClubId && clubs.length > 0) {
      const club = clubs.find(c => c.id === config.defaultClubId);
      if (club && club.organizationId) {
        setFormData(prev => ({
          ...prev,
          organizationId: club.organizationId,
        }));
      }
    }
  }, [config.context, config.defaultClubId, clubs]);

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
        newErrors.organizationId = t("errors.organizationRequired");
      }
      if (!formData.role) {
        newErrors.role = t("errors.roleRequired");
      }
      if ((formData.role === "CLUB_ADMIN" || formData.role === "CLUB_OWNER") && !formData.clubId) {
        newErrors.clubId = t("errors.clubRequired");
      }
    } else if (step === 2) {
      // Validate user source
      if (!formData.userSource) {
        newErrors.userSource = t("errors.userSourceRequired");
      }
    } else if (step === 3) {
      // Validate user details based on source
      if (formData.userSource === "existing") {
        if (!formData.userId) {
          newErrors.userId = t("errors.userRequired");
        }
      } else {
        // New user validation - only email is required for invite flow
        // Name and phone are optional metadata for admin's reference
        if (!formData.email || !formData.email.trim()) {
          newErrors.email = t("errors.emailRequired");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = t("errors.emailInvalid");
        }
        // Optional fields - validate format if provided
        if (formData.phone && formData.phone.trim() && !/^\+?[0-9\s\-\(\)]+$/.test(formData.phone)) {
          newErrors.phone = t("errors.phoneInvalid");
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, t]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) { // Changed to -1 because step 5 is confirm, not a navigation step
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, validateStep, STEPS.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 1 && currentStep < STEPS.length) { // Can't go back from confirm step
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep, STEPS.length]);

  const handleSubmit = async () => {
    // Validate step 4 (Review)
    if (!validateStep(4)) {
      return;
    }

    // Final validation based on user source
    if (formData.userSource === "existing") {
      if (!formData.organizationId || !formData.role || !formData.userId) {
        setErrors({ general: t("errors.allFieldsRequired") });
        return;
      }
    } else {
      // For new users (invite flow), only email and role are required
      if (!formData.organizationId || !formData.role || !formData.email) {
        setErrors({ general: t("errors.allFieldsRequired") });
        return;
      }
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      let response: Response;
      let data: unknown;

      // For new users, use the Invite API to send email invitations
      // For existing users, use the admin creation API for direct role assignment
      if (formData.userSource === "new") {
        // Prepare invite payload
        const invitePayload: Record<string, unknown> = {
          email: formData.email?.trim().toLowerCase(),
          role: formData.role,
        };

        // Add context (org or club)
        if (formData.role === "ORGANIZATION_OWNER" || formData.role === "ORGANIZATION_ADMIN") {
          invitePayload.organizationId = formData.organizationId;
        } else {
          invitePayload.clubId = formData.clubId;
        }

        response = await fetch("/api/invites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invitePayload),
        });

        data = await response.json();
      } else {
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

        response = await fetch("/api/admin/admins/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        data = await response.json();
      }

      if (!response.ok) {
        // Handle validation errors
        // Type guard for error response structure
        interface ErrorResponse {
          error?: string;
          field?: string;
          existingInviteId?: string;
        }
        
        const errorData = (typeof data === 'object' && data !== null) 
          ? data as ErrorResponse 
          : { error: 'Unknown error' };
        
        if (response.status === 409) {
          if (errorData.field === "email") {
            setErrors({ email: errorData.error || t("errors.emailInUse") });
            setCurrentStep(3); // Go back to user details step
          } else if (errorData.field === "phone") {
            setErrors({ phone: errorData.error || t("errors.phoneInUse") });
            setCurrentStep(3);
          } else if (errorData.field === "owner") {
            setErrors({ general: errorData.error || t("errors.ownerExists") });
          } else if (errorData.existingInviteId) {
            // Handle existing active invite
            setErrors({ general: errorData.error || t("errors.inviteExists") });
          } else {
            setErrors({ general: errorData.error || t("errors.conflictOccurred") });
          }
        } else if (response.status === 403) {
          setErrors({ general: errorData.error || t("errors.permissionDenied") });
        } else {
          setErrors({ general: errorData.error || t("errors.createFailed") });
        }
        showToast("error", errorData.error || t("errors.createFailed"));
        setConfirmSuccess(false);
        setConfirmMessage(errorData.error || t("errors.createFailed"));
        setCurrentStep(5); // Move to confirm step to show error
        return;
      }

      // Success! Move to confirm step
      setConfirmSuccess(true);
      setConfirmMessage(
        formData.userSource === "existing"
          ? t("messages.successExisting")
          : t("messages.successInvite")
      );
      setCurrentStep(5);
      showToast("success", t("messages.operationSuccess"));

      // Call success callback if provided
      if (config.onSuccess) {
        // Type guard for success response structure
        interface SuccessResponse {
          userId?: string;
          invite?: { id: string };
        }
        
        const responseData = (typeof data === 'object' && data !== null)
          ? data as SuccessResponse
          : {};
        
        // For existing users, we get userId directly
        // For invites, we get invite.id
        // Default to empty string if neither is available (though this shouldn't happen in normal flow)
        const resultId = responseData.userId || responseData.invite?.id || "";
        
        // Only call callback if we have a valid ID
        if (resultId) {
          config.onSuccess(resultId);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.createFailed");
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
            <h2 className="im-wizard-section-title">{t("userSourceStep.title")}</h2>
            <p className="im-wizard-section-description">
              {t("userSourceStep.description")}
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
            <h2 className="im-wizard-section-title">{t("userDataStep.title")}</h2>
            <p className="im-wizard-section-description">
              {formData.userSource === "existing"
                ? t("userDataStep.descriptionExisting")
                : t("userDataStep.descriptionNew")}
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
            <h2 className="im-wizard-section-title">{t("reviewStep.title")}</h2>
            <p className="im-wizard-section-description">
              {t("reviewStep.description")}
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
              {confirmSuccess ? t("confirmStep.success") : t("confirmStep.error")}
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
          {currentStep < 5 && (
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {t("navigation.cancel")}
            </Button>
          )}
          {currentStep === 5 && (
            <Button
              type="button"
              onClick={handleCancel}
            >
              {t("navigation.close")}
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
              {t("navigation.back")}
            </Button>
          )}
          {currentStep < 4 && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting || isLoadingOrgs || isLoadingClubs}
            >
              {t("navigation.next")}
            </Button>
          )}
          {currentStep === 4 && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? t("navigation.processing") : formData.userSource === "existing" ? t("navigation.assignRole") : t("navigation.createAdmin")}
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
