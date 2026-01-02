"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { LogoStep, BannerStep } from "./OrganizationSteps";
import "./ClubCreationStepper.css";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface StepperFormData {
  // Step 1: Basic Information & Description
  name: string;
  slug: string;
  description: string;
  // Step 2: Organization Address
  country: string;
  city: string;
  postalCode: string;
  street: string;
  latitude: string;
  longitude: string;
  // Step 3: Contacts & Website / Social Media
  contactEmail: string;
  contactPhone: string;
  website: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  // Step 4: Images & Logo
  logoCount: 'one' | 'two';
  logo: UploadedFile | null;
  logoTheme: 'light' | 'dark';
  logoBackground: 'light' | 'dark';
  secondLogo: UploadedFile | null;
  secondLogoTheme: 'light' | 'dark';
  // Step 5: Banner
  heroImage: UploadedFile | null;
  bannerAlignment: 'top' | 'center' | 'bottom';
  // Step 6: Assign Owner / SuperAdmin
  assignOwner: boolean;
  ownerType: "existing" | "new";
  existingUserId: string;
  newOwnerName: string;
  newOwnerEmail: string;
  newOwnerPassword: string;
}

const initialFormData: StepperFormData = {
  name: "",
  slug: "",
  description: "",
  country: "",
  city: "",
  postalCode: "",
  street: "",
  latitude: "",
  longitude: "",
  contactEmail: "",
  contactPhone: "",
  website: "",
  facebook: "",
  instagram: "",
  linkedin: "",
  logoCount: "one",
  logo: null,
  logoTheme: "light",
  logoBackground: "light",
  secondLogo: null,
  secondLogoTheme: "dark",
  heroImage: null,
  bannerAlignment: "center",
  assignOwner: false,
  ownerType: "existing",
  existingUserId: "",
  newOwnerName: "",
  newOwnerEmail: "",
  newOwnerPassword: "",
};

export function OrganizationCreationStepper() {
  const router = useRouter();
  const t = useTranslations("organizations.stepper");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StepperFormData>(initialFormData);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const createOrganization = useOrganizationStore((state) => state.createOrganization);

  const STEPS = [
    { id: 1, label: t("stepBasicInfo") },
    { id: 2, label: t("stepAddress") },
    { id: 3, label: t("stepContacts") },
    { id: 4, label: t("stepLogo") },
    { id: 5, label: t("stepBanner") },
    { id: 6, label: t("stepOwner") },
  ];

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleFieldChange = useCallback(
    (field: string, value: UploadedFile | null | boolean | string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      // Clear error for this field
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
      // Step 1: Basic Information & Description (mandatory)
      if (!formData.name.trim()) {
        errors.name = t("validation.nameRequired");
      }
      if (!formData.description.trim()) {
        errors.description = t("validation.descriptionRequired");
      }
    }

    if (step === 2) {
      // Step 2: Organization Address (mandatory with map)
      if (!formData.country.trim()) {
        errors.country = t("validation.countryRequired");
      }
      if (!formData.city.trim()) {
        errors.city = t("validation.cityRequired");
      }
      if (!formData.street.trim()) {
        errors.street = t("validation.streetRequired");
      }
      if (!formData.latitude.trim()) {
        errors.latitude = t("validation.latitudeRequired");
      } else if (isNaN(parseFloat(formData.latitude))) {
        errors.latitude = t("validation.latitudeInvalid");
      } else {
        const lat = parseFloat(formData.latitude);
        if (lat < -90 || lat > 90) {
          errors.latitude = t("validation.latitudeRange");
        }
      }
      if (!formData.longitude.trim()) {
        errors.longitude = t("validation.longitudeRequired");
      } else if (isNaN(parseFloat(formData.longitude))) {
        errors.longitude = t("validation.longitudeInvalid");
      } else {
        const lng = parseFloat(formData.longitude);
        if (lng < -180 || lng > 180) {
          errors.longitude = t("validation.longitudeRange");
        }
      }
    }

    // Step 3: Contacts & Website / Social Media (optional)
    if (step === 3) {
      if (formData.contactEmail && !formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.contactEmail = t("validation.emailInvalid");
      }
    }

    // Step 4: Logo (optional, but if two logos selected, both required)
    if (step === 4) {
      if (formData.logoCount === 'two') {
        if (formData.logo && !formData.secondLogo) {
          errors.secondLogo = t("validation.secondLogoRequired");
        }
        if (!formData.logo && formData.secondLogo) {
          errors.logo = t("validation.primaryLogoRequired");
        }
      }
    }

    // Step 5: Banner (heroImage mandatory)
    if (step === 5) {
      if (!formData.heroImage) {
        errors.heroImage = t("validation.backgroundRequired");
      }
    }

    // Step 6: Owner assignment (optional, but if choosing to assign, validate fields)
    if (step === 6 && formData.assignOwner) {
      if (formData.ownerType === "existing" && !formData.existingUserId) {
        errors.existingUserId = t("validation.userRequired");
      }
      if (formData.ownerType === "new") {
        if (!formData.newOwnerName.trim()) {
          errors.newOwnerName = t("validation.nameFieldRequired");
        }
        if (!formData.newOwnerEmail.trim()) {
          errors.newOwnerEmail = t("validation.emailFieldRequired");
        } else if (!formData.newOwnerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.newOwnerEmail = t("validation.emailInvalid");
        }
        if (!formData.newOwnerPassword.trim()) {
          errors.newOwnerPassword = t("validation.passwordRequired");
        } else if (formData.newOwnerPassword.length < 8) {
          errors.newOwnerPassword = t("validation.passwordMinLength");
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
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

  // Helper function to update metadata with second logo URL
  const updateMetadataWithSecondLogo = async (
    organizationId: string,
    baseMetadata: Record<string, unknown>,
    secondLogoUrl: string
  ) => {
    const currentLogoMetadata = baseMetadata.logoMetadata as Record<string, unknown> || {};
    const updatedMetadata = {
      ...baseMetadata,
      logoMetadata: {
        ...currentLogoMetadata,
        secondLogo: secondLogoUrl,
      }
    };
    
    await fetch(`/api/admin/organizations/${organizationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: updatedMetadata }),
    });
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    // Final validation - check all required steps
    if (!formData.name.trim() || !formData.description.trim()) {
      setError(t("errors.basicInfoRequired"));
      setCurrentStep(1);
      return;
    }

    if (!formData.country.trim() || !formData.city.trim() || !formData.street.trim() ||
      !formData.latitude.trim() || !formData.longitude.trim()) {
      setError(t("errors.addressRequired"));
      setCurrentStep(2);
      return;
    }

    if (!formData.heroImage) {
      setError(t("validation.backgroundRequired"));
      setCurrentStep(4);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build address from components
      const addressParts = [
        formData.street.trim(),
        formData.city.trim(),
        formData.postalCode.trim(),
        formData.country.trim()
      ].filter(Boolean); // Remove empty strings
      const fullAddress = addressParts.join(", ");

      // Prepare metadata with social links and location
      const metadata: Record<string, unknown> = {
        country: formData.country.trim(),
        street: formData.street.trim(),
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
      };

      // Add social media links if provided
      const socialLinks: Record<string, string> = {};
      if (formData.facebook.trim()) socialLinks.facebook = formData.facebook.trim();
      if (formData.instagram.trim()) socialLinks.instagram = formData.instagram.trim();
      if (formData.linkedin.trim()) socialLinks.linkedin = formData.linkedin.trim();

      if (Object.keys(socialLinks).length > 0) {
        metadata.socialLinks = socialLinks;
      }

      // Add logo theme metadata if logos are provided
      if (formData.logo || formData.secondLogo) {
        const logoMetadata: Record<string, unknown> = {
          logoTheme: formData.logoTheme,
          logoCount: formData.logoCount,
          logoBackground: formData.logoBackground, // Save logo background for display in banners and cards
        };
        
        if (formData.logoCount === 'two' && formData.secondLogo) {
          logoMetadata.secondLogoTheme = formData.secondLogoTheme;
        }
        
        metadata.logoMetadata = logoMetadata;
      }

      // Prepare bannerData with position
      const bannerData: Record<string, unknown> | undefined = formData.bannerAlignment ? {
        position: formData.bannerAlignment,
      } : undefined;

      // Prepare data for submission (without images - they'll be uploaded separately)
      const submitData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim(),
        address: fullAddress,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        website: formData.website.trim() || undefined,
        metadata,
        bannerData, // Include bannerData with position
      };

      const organization = await createOrganization(submitData);

      // Upload images after organization is created
      // Note: heroImage is validated as required before submission (see validation above)
      // But we only upload if a file was selected (not an existing URL)
      try {
        // Upload heroImage if a new file was selected
        if (formData.heroImage?.file) {
          const heroFormData = new FormData();
          heroFormData.append("file", formData.heroImage.file);
          heroFormData.append("type", "heroImage");

          const heroResponse = await fetch(`/api/images/organizations/${organization.id}/upload`, {
            method: "POST",
            body: heroFormData,
          });

          if (!heroResponse.ok) {
            const errorData = await heroResponse.json();
            throw new Error(errorData.error || t("errors.imageUploadFailed"));
          }
        }

        // Upload logo if a new file was selected (optional)
        if (formData.logo?.file) {
          const logoFormData = new FormData();
          logoFormData.append("file", formData.logo.file);
          logoFormData.append("type", "logo");

          const logoResponse = await fetch(`/api/images/organizations/${organization.id}/upload`, {
            method: "POST",
            body: logoFormData,
          });

          if (!logoResponse.ok) {
            const errorData = await logoResponse.json();
            throw new Error(errorData.error || t("errors.imageUploadFailed"));
          }
          
          // Upload second logo if provided
          if (formData.logoCount === 'two' && formData.secondLogo?.file) {
            const secondLogoFormData = new FormData();
            secondLogoFormData.append("file", formData.secondLogo.file);
            secondLogoFormData.append("type", "secondLogo");

            const secondLogoResponse = await fetch(`/api/images/organizations/${organization.id}/upload`, {
              method: "POST",
              body: secondLogoFormData,
            });

            if (!secondLogoResponse.ok) {
              const errorData = await secondLogoResponse.json();
              throw new Error(errorData.error || t("errors.secondLogoUploadFailed"));
            }
            
            const secondLogoData = await secondLogoResponse.json();
            
            // Update metadata with second logo URL using helper
            await updateMetadataWithSecondLogo(organization.id, metadata, secondLogoData.url);
          }
        }
      } catch (imageErr) {
        // Organization was created, but image upload failed
        const imageMessage = imageErr instanceof Error ? imageErr.message : t("errors.imageUploadFailed");
        showToast("error", t("success.createdImageFailed", { message: imageMessage }));
        
        // Continue with owner assignment or redirect
      }

      // If owner assignment is requested, assign the owner
      if (formData.assignOwner) {
        try {
          const assignPayload: Record<string, unknown> = {
            organizationId: organization.id,
            setAsPrimaryOwner: true,
          };

          if (formData.ownerType === "existing") {
            assignPayload.userId = formData.existingUserId;
            assignPayload.createNew = false;
          } else {
            assignPayload.createNew = true;
            assignPayload.name = formData.newOwnerName.trim();
            assignPayload.email = formData.newOwnerEmail.trim();
            assignPayload.password = formData.newOwnerPassword;
          }

          const assignResponse = await fetch(`/api/admin/organizations/${organization.id}/admins`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(assignPayload),
          });

          if (!assignResponse.ok) {
            const errorData = await assignResponse.json();
            throw new Error(errorData.error || t("errors.assignOwnerFailed"));
          }

          showToast("success", t("success.createdWithOwner"));
        } catch (ownerErr) {
          // Organization was created, but owner assignment failed
          const ownerMessage = ownerErr instanceof Error ? ownerErr.message : t("errors.assignOwnerFailed");
          showToast("error", t("success.createdOwnerFailed", { message: ownerMessage }));

          // Still redirect to the organization page
          setTimeout(() => {
            router.push(`/admin/organizations/${organization.id}`);
          }, 2000);
          return;
        }
      } else {
        showToast("success", t("success.created"));
      }

      // Redirect to the organization detail page
      setTimeout(() => {
        router.push(`/admin/organizations/${organization.id}`);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : t("errors.createFailed");

      // Check for slug conflict
      if (message.includes("slug")) {
        setFieldErrors({ slug: t("errors.slugInUse") });
        setCurrentStep(1);
        setError(t("errors.slugConflict"));
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

  // State for user search in step 5
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Debounced user search
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const response = await fetch(`/api/admin/users/list?search=${encodeURIComponent(query)}&pageSize=10`);
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users || []);
      }
    } catch (error) {
      console.error("Failed to search users:", error);
    } finally {
      setIsSearchingUsers(false);
    }
  }, []);

  // Debounced search effect
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleUserSearchChange = useCallback((query: string) => {
    setUserSearchQuery(query);

    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      searchUsers(query);
    }, 300);

    setSearchDebounceTimer(timer);
  }, [searchDebounceTimer, searchUsers]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Basic Information & Description
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("basicInfoTitle")}</h2>
            <p className="im-stepper-section-description">
              {t("basicInfoDescription")}
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label={t("organizationName")}
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t("organizationNamePlaceholder")}
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
                    label={t("slugOptional")}
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder={t("slugPlaceholder")}
                    disabled={isSubmitting}
                  />
                  <span className="im-stepper-field-hint">
                    {t("slugHintAuto")}
                  </span>
                  {fieldErrors.slug && (
                    <span className="im-stepper-field-error">{fieldErrors.slug}</span>
                  )}
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Textarea
                    label={t("shortDescription")}
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder={t("descriptionPlaceholder")}
                    disabled={isSubmitting}
                    rows={4}
                  />
                  {fieldErrors.description && (
                    <span className="im-stepper-field-error">{fieldErrors.description}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );

      case 2:
        // Step 2: Organization Address
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("addressTitle")}</h2>
            <p className="im-stepper-section-description">
              {t("addressDescription")}
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row im-stepper-row--two">
                <div className="im-stepper-field">
                  <Input
                    label={t("country")}
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder={t("countryPlaceholder")}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.country && (
                    <span className="im-stepper-field-error">{fieldErrors.country}</span>
                  )}
                </div>
                <div className="im-stepper-field">
                  <Input
                    label={t("city")}
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder={t("cityPlaceholder")}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.city && (
                    <span className="im-stepper-field-error">{fieldErrors.city}</span>
                  )}
                </div>
              </div>

              <div className="im-stepper-row im-stepper-row--two">
                <div className="im-stepper-field">
                  <Input
                    label={t("street")}
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder={t("streetPlaceholder")}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.street && (
                    <span className="im-stepper-field-error">{fieldErrors.street}</span>
                  )}
                </div>
                <div className="im-stepper-field">
                  <Input
                    label={t("postalCode")}
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    placeholder={t("postalCodePlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row im-stepper-row--two">
                <div className="im-stepper-field">
                  <Input
                    label={t("latitude")}
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder={t("latitudePlaceholder")}
                    disabled={isSubmitting}
                    type="number"
                    step="any"
                  />
                  {fieldErrors.latitude && (
                    <span className="im-stepper-field-error">{fieldErrors.latitude}</span>
                  )}
                </div>
                <div className="im-stepper-field">
                  <Input
                    label={t("longitude")}
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder={t("longitudePlaceholder")}
                    disabled={isSubmitting}
                    type="number"
                    step="any"
                  />
                  {fieldErrors.longitude && (
                    <span className="im-stepper-field-error">{fieldErrors.longitude}</span>
                  )}
                </div>
              </div>

              <div className="im-stepper-row">
                <span className="im-stepper-field-hint">
                  {t("mapTip")}
                </span>
              </div>
            </div>
          </Card>
        );

      case 3:
        // Step 3: Contacts & Website / Social Media
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("contactsTitle")}</h2>
            <p className="im-stepper-section-description">
              {t("contactsDescription")}
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row im-stepper-row--two">
                <div className="im-stepper-field">
                  <Input
                    label={t("organizationEmail")}
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder={t("organizationEmailPlaceholder")}
                    disabled={isSubmitting}
                  />
                  {fieldErrors.contactEmail && (
                    <span className="im-stepper-field-error">{fieldErrors.contactEmail}</span>
                  )}
                </div>
                <div className="im-stepper-field">
                  <Input
                    label={t("phoneNumber")}
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder={t("phoneNumberPlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label={t("website")}
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder={t("websitePlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label={t("facebook")}
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    placeholder={t("facebookPlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label={t("instagram")}
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    placeholder={t("instagramPlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label={t("linkedin")}
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleInputChange}
                    placeholder={t("linkedinPlaceholder")}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </Card>
        );

      case 4:
        // Step 4: Logo & Theme
        return (
          <LogoStep
            formData={formData}
            fieldErrors={fieldErrors}
            isSubmitting={isSubmitting}
            onChange={handleFieldChange}
          />
        );

      case 5:
        // Step 5: Banner
        return (
          <BannerStep
            formData={formData}
            fieldErrors={fieldErrors}
            isSubmitting={isSubmitting}
            onChange={handleFieldChange}
          />
        );

      case 6:
        // Step 6: Assign Owner / SuperAdmin
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">{t("ownerTitle")}</h2>
            <p className="im-stepper-section-description">
              {t("ownerDescription")}
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <label className="im-stepper-label">
                    <input
                      type="checkbox"
                      checked={formData.assignOwner}
                      onChange={(e) => setFormData((prev) => ({ ...prev, assignOwner: e.target.checked }))}
                      disabled={isSubmitting}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {t("assignOwnerCheckbox")}
                  </label>
                </div>
              </div>

              {formData.assignOwner && (
                <>
                  <div className="im-stepper-row">
                    <div className="im-stepper-field im-stepper-field--full">
                      <label className="im-stepper-label">{t("ownerType")}</label>
                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="radio"
                            name="ownerType"
                            value="existing"
                            checked={formData.ownerType === "existing"}
                            onChange={(e) => setFormData((prev) => ({ ...prev, ownerType: e.target.value as "existing" | "new" }))}
                            disabled={isSubmitting}
                          />
                          {t("existingUserOption")}
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <input
                            type="radio"
                            name="ownerType"
                            value="new"
                            checked={formData.ownerType === "new"}
                            onChange={(e) => setFormData((prev) => ({ ...prev, ownerType: e.target.value as "existing" | "new" }))}
                            disabled={isSubmitting}
                          />
                          {t("newUserOption")}
                        </label>
                      </div>
                    </div>
                  </div>

                  {formData.ownerType === "existing" ? (
                    <div className="im-stepper-row">
                      <div className="im-stepper-field im-stepper-field--full">
                        <Input
                          label={t("searchUser")}
                          value={userSearchQuery}
                          onChange={(e) => handleUserSearchChange(e.target.value)}
                          placeholder={t("searchUserPlaceholder")}
                          disabled={isSubmitting}
                        />
                        {isSearchingUsers && (
                          <span className="im-stepper-field-hint">{t("searching")}</span>
                        )}
                        {userSearchResults.length > 0 && (
                          <div style={{
                            marginTop: "0.5rem",
                            border: "1px solid var(--rsp-border)",
                            borderRadius: "0.375rem",
                            maxHeight: "200px",
                            overflowY: "auto"
                          }}>
                            {userSearchResults.map((user) => (
                              <div
                                key={user.id}
                                onClick={() => {
                                  setFormData((prev) => ({ ...prev, existingUserId: user.id }));
                                  setUserSearchQuery(`${user.name || user.email}`);
                                  setUserSearchResults([]);
                                }}
                                style={{
                                  padding: "0.75rem",
                                  cursor: "pointer",
                                  borderBottom: "1px solid var(--rsp-border)",
                                  backgroundColor: formData.existingUserId === user.id ? "var(--rsp-primary)" : "transparent",
                                  color: formData.existingUserId === user.id ? "white" : "inherit"
                                }}
                              >
                                <div style={{ fontWeight: 500 }}>{user.name || t("noNameUser")}</div>
                                <div style={{ fontSize: "0.875rem", opacity: 0.8 }}>{user.email}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        {fieldErrors.existingUserId && (
                          <span className="im-stepper-field-error">{fieldErrors.existingUserId}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="im-stepper-row">
                        <div className="im-stepper-field im-stepper-field--full">
                          <Input
                            label={t("fullName")}
                            name="newOwnerName"
                            value={formData.newOwnerName}
                            onChange={handleInputChange}
                            placeholder={t("fullNamePlaceholder")}
                            disabled={isSubmitting}
                          />
                          {fieldErrors.newOwnerName && (
                            <span className="im-stepper-field-error">{fieldErrors.newOwnerName}</span>
                          )}
                        </div>
                      </div>

                      <div className="im-stepper-row">
                        <div className="im-stepper-field im-stepper-field--full">
                          <Input
                            label={t("emailField")}
                            name="newOwnerEmail"
                            type="email"
                            value={formData.newOwnerEmail}
                            onChange={handleInputChange}
                            placeholder={t("emailPlaceholder")}
                            disabled={isSubmitting}
                          />
                          {fieldErrors.newOwnerEmail && (
                            <span className="im-stepper-field-error">{fieldErrors.newOwnerEmail}</span>
                          )}
                        </div>
                      </div>

                      <div className="im-stepper-row">
                        <div className="im-stepper-field im-stepper-field--full">
                          <Input
                            label={t("passwordField")}
                            name="newOwnerPassword"
                            type="password"
                            value={formData.newOwnerPassword}
                            onChange={handleInputChange}
                            placeholder={t("passwordPlaceholder")}
                            disabled={isSubmitting}
                          />
                          {fieldErrors.newOwnerPassword && (
                            <span className="im-stepper-field-error">{fieldErrors.newOwnerPassword}</span>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
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
        {t("stepProgress", { current: currentStep, total: STEPS.length })}
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
          {currentStep < STEPS.length ? (
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
              {isSubmitting ? t("creating") : t("createOrganizationButton")}
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
