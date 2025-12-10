"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import "./ClubCreationStepper.css";

interface StepperFormData {
  // Step 1: General Information
  name: string;
  slug: string;
  // Step 2: Contact Information (Optional)
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
}

const initialFormData: StepperFormData = {
  name: "",
  slug: "",
  address: "",
  city: "",
  postalCode: "",
  phone: "",
  email: "",
  website: "",
};

const STEPS = [
  { id: 1, label: "General" },
  { id: 2, label: "Contacts" },
];

export function OrganizationCreationStepper() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StepperFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const createOrganization = useOrganizationStore((state) => state.createOrganization);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Clear error for this field
      if (fieldErrors[name]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [fieldErrors]
  );

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      if (!formData.name.trim()) {
        errors.name = "Organization name is required";
      }
    }

    // Step 2 has no required fields

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

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Final validation
    if (!formData.name.trim()) {
      setError("Organization name is required");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Prepare data for submission
      const submitData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        website: formData.website.trim() || undefined,
      };

      const data = await createOrganization(submitData);

      showToast("success", "Organization created successfully!");

      // Redirect to the organization detail page
      setTimeout(() => {
        router.push(`/admin/organizations/${data.id}`);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create organization";
      
      // Check for slug conflict
      if (message.includes("slug")) {
        setFieldErrors({ slug: "This slug is already in use" });
        setCurrentStep(1);
        setError("Slug conflict: Please choose a different slug");
      } else {
        setError(message);
      }
      
      showToast("error", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/organizations");
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">General Information</h2>
            <p className="im-stepper-section-description">
              Enter the basic details about the organization.
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label="Organization Name *"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter organization name"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.name && (
                    <span className="im-stepper-field-error">{fieldErrors.name}</span>
                  )}
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label="Slug (optional)"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="organization-slug"
                    disabled={isSubmitting}
                  />
                  <span className="im-stepper-field-hint">
                    Auto-generated from name if empty
                  </span>
                  {fieldErrors.slug && (
                    <span className="im-stepper-field-error">{fieldErrors.slug}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Contact Information</h2>
            <p className="im-stepper-section-description">
              Provide optional contact information and location details.
            </p>
            <div className="im-step-content">
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
                    placeholder="+1 234 567 8900"
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
                    placeholder="contact@organization.com"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label="Website"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://www.organization.com"
                    disabled={isSubmitting}
                  />
                </div>
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
              {isSubmitting ? "Creating..." : "Create Organization"}
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
