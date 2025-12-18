"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@/components/ui";
import "./ClubCreationStepper.css";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface EntityData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  logo?: string | null;
  heroImage?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface StepConfig {
  id: number;
  label: string;
}

// Step component props interface
// NOTE: formData is typed as `unknown` to support different data structures per step.
// Individual step components should cast formData to their expected type.
// For better type safety, consider using generics or union types in future versions.
interface StepComponentProps {
  formData: unknown;
  fieldErrors: Record<string, string>;
  isSubmitting: boolean;
  onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null) => void);
}

interface EntityEditStepperProps {
  isOpen: boolean;
  onClose: () => void;
  entityData: EntityData;
  steps: StepConfig[];
  stepComponents: React.ComponentType<StepComponentProps>[];
  translationNamespace?: string;
  onSave: (data: {
    name: string;
    slug: string;
    description: string | null;
    address: string;
    metadata: Record<string, unknown>;
    logo?: File | null;
    heroImage?: File | null;
  }) => Promise<void>;
}

export function EntityEditStepper({
  isOpen,
  onClose,
  entityData,
  steps,
  stepComponents,
  translationNamespace = "organizations.stepper",
  onSave,
}: EntityEditStepperProps) {
  const t = useTranslations(translationNamespace);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [basicInfoData, setBasicInfoData] = useState({
    name: "",
    slug: "",
    description: "",
  });

  const [addressData, setAddressData] = useState({
    country: "",
    city: "",
    postalCode: "",
    street: "",
    latitude: "",
    longitude: "",
  });

  const [imagesData, setImagesData] = useState<{
    logo: UploadedFile | null;
    heroImage: UploadedFile | null;
  }>({
    logo: null,
    heroImage: null,
  });

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen && entityData) {
      const metadata = entityData.metadata as {
        country?: string;
        street?: string;
        latitude?: number;
        longitude?: number;
      } | null;

      // Parse address to extract components
      const addressParts = entityData.address?.split(", ") || [];
      const street = metadata?.street || addressParts[0] || "";
      const city = addressParts.length > 1 ? addressParts[1] : "";
      const postalCode = addressParts.length > 2 ? addressParts[2] : "";
      const country = metadata?.country || (addressParts.length > 3 ? addressParts[3] : "");

      setBasicInfoData({
        name: entityData.name,
        slug: entityData.slug,
        description: entityData.description || "",
      });

      setAddressData({
        country,
        city,
        postalCode,
        street,
        latitude: metadata?.latitude?.toString() || "",
        longitude: metadata?.longitude?.toString() || "",
      });

      // Set existing images as URLs (not files)
      setImagesData({
        logo: entityData.logo ? { url: entityData.logo, key: "", preview: entityData.logo } : null,
        heroImage: entityData.heroImage ? { url: entityData.heroImage, key: "", preview: entityData.heroImage } : null,
      });

      setFieldErrors({});
      setError(null);
      setCurrentStep(1);
    }
  }, [isOpen, entityData]);

  const handleBasicInfoChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setBasicInfoData((prev) => ({ ...prev, [name]: value }));

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

  const handleAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setAddressData((prev) => ({ ...prev, [name]: value }));

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

  const handleImageChange = useCallback(
    (field: 'logo' | 'heroImage', value: UploadedFile | null) => {
      setImagesData((prev) => ({ ...prev, [field]: value }));

      if (fieldErrors[field]) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
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
      if (!basicInfoData.name.trim()) {
        errors.name = t("validation.nameRequired");
      }
      if (!basicInfoData.description.trim()) {
        errors.description = t("validation.descriptionRequired");
      }
    }

    if (step === 2) {
      if (!addressData.country.trim()) {
        errors.country = t("validation.countryRequired");
      }
      if (!addressData.city.trim()) {
        errors.city = t("validation.cityRequired");
      }
      if (!addressData.street.trim()) {
        errors.street = t("validation.streetRequired");
      }
      if (!addressData.latitude.trim()) {
        errors.latitude = t("validation.latitudeRequired");
      } else if (isNaN(parseFloat(addressData.latitude))) {
        errors.latitude = t("validation.latitudeInvalid");
      } else {
        const lat = parseFloat(addressData.latitude);
        if (lat < -90 || lat > 90) {
          errors.latitude = t("validation.latitudeRange");
        }
      }
      if (!addressData.longitude.trim()) {
        errors.longitude = t("validation.longitudeRequired");
      } else if (isNaN(parseFloat(addressData.longitude))) {
        errors.longitude = t("validation.longitudeInvalid");
      } else {
        const lng = parseFloat(addressData.longitude);
        if (lng < -180 || lng > 180) {
          errors.longitude = t("validation.longitudeRange");
        }
      }
    }

    if (step === 3) {
      // Images are optional for editing (already have existing images)
      // No validation needed
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [basicInfoData, addressData, t]);

  const handleNext = useCallback(() => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length) {
        setCurrentStep((prev) => prev + 1);
      }
    }
  }, [currentStep, validateStep, steps.length]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build full address from components
      const addressParts = [
        addressData.street.trim(),
        addressData.city.trim(),
        addressData.postalCode.trim(),
        addressData.country.trim()
      ].filter(Boolean);
      const fullAddress = addressParts.join(", ");

      // Prepare metadata
      const metadata: Record<string, unknown> = {
        country: addressData.country.trim(),
        street: addressData.street.trim(),
        latitude: parseFloat(addressData.latitude),
        longitude: parseFloat(addressData.longitude),
      };

      // Call the onSave callback with updated data
      await onSave({
        name: basicInfoData.name.trim(),
        slug: basicInfoData.slug.trim(),
        description: basicInfoData.description.trim() || null,
        address: fullAddress,
        metadata,
        logo: imagesData.logo?.file || null,
        heroImage: imagesData.heroImage?.file || null,
      });

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.createFailed");
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const renderStepContent = () => {
    const StepComponent = stepComponents[currentStep - 1];
    if (!StepComponent) return null;

    // Determine which form data to pass based on step
    // NOTE: This assumes a 3-step flow with basic info, address, and images.
    // For different entity types with different step structures, consider:
    // 1. Passing a data mapping configuration as a prop
    // 2. Using a more generic form state management approach
    // 3. Creating specialized stepper components per entity type
    let formData: unknown;
    let onChange: ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) | ((field: string, value: UploadedFile | null) => void);

    switch (currentStep) {
      case 1:
        formData = basicInfoData;
        onChange = handleBasicInfoChange;
        break;
      case 2:
        formData = addressData;
        onChange = handleAddressChange;
        break;
      case 3:
        formData = imagesData;
        onChange = handleImageChange;
        break;
      default:
        formData = {};
        onChange = () => {};
    }

    return (
      <StepComponent
        formData={formData}
        fieldErrors={fieldErrors}
        isSubmitting={isSubmitting}
        onChange={onChange}
      />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="im-stepper">
        {/* Step Indicator */}
        <div className="im-stepper-indicator">
          {steps.map((step, index) => (
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
              {index < steps.length - 1 && (
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
          {t("stepProgress", { current: currentStep, total: steps.length })}
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
              {t("cancel")}
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
                {t("back")}
              </Button>
            )}
            {currentStep < steps.length ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
              >
                {t("next")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? t("saving") : t("saveChanges")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
