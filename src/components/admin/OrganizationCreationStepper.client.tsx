"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { useOrganizationStore } from "@/stores/useOrganizationStore";
import { UploadField } from "./UploadField.client";
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
  logo: UploadedFile | null;
  heroImage: UploadedFile | null;
  // Step 5: Assign Owner / SuperAdmin
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
  logo: null,
  heroImage: null,
  assignOwner: false,
  ownerType: "existing",
  existingUserId: "",
  newOwnerName: "",
  newOwnerEmail: "",
  newOwnerPassword: "",
};

const STEPS = [
  { id: 1, label: "Basic Info" },
  { id: 2, label: "Address" },
  { id: 3, label: "Contacts" },
  { id: 4, label: "Images" },
  { id: 5, label: "Owner" },
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

  // Validation per step
  const validateStep = useCallback((step: number): boolean => {
    const errors: Record<string, string> = {};

    if (step === 1) {
      // Step 1: Basic Information & Description (mandatory)
      if (!formData.name.trim()) {
        errors.name = "Organization name is required";
      }
      if (!formData.description.trim()) {
        errors.description = "Description is required";
      }
    }

    if (step === 2) {
      // Step 2: Organization Address (mandatory with map)
      if (!formData.country.trim()) {
        errors.country = "Country is required";
      }
      if (!formData.city.trim()) {
        errors.city = "City is required";
      }
      if (!formData.street.trim()) {
        errors.street = "Street is required";
      }
      if (!formData.latitude.trim()) {
        errors.latitude = "Latitude is required for map location";
      } else if (isNaN(parseFloat(formData.latitude))) {
        errors.latitude = "Latitude must be a valid number";
      } else {
        const lat = parseFloat(formData.latitude);
        if (lat < -90 || lat > 90) {
          errors.latitude = "Latitude must be between -90 and 90";
        }
      }
      if (!formData.longitude.trim()) {
        errors.longitude = "Longitude is required for map location";
      } else if (isNaN(parseFloat(formData.longitude))) {
        errors.longitude = "Longitude must be a valid number";
      } else {
        const lng = parseFloat(formData.longitude);
        if (lng < -180 || lng > 180) {
          errors.longitude = "Longitude must be between -180 and 180";
        }
      }
    }

    // Step 3: Contacts & Website / Social Media (optional)
    if (step === 3) {
      if (formData.contactEmail && !formData.contactEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.contactEmail = "Invalid email format";
      }
    }

    // Step 4: Images & Logo (heroImage mandatory, logo optional)
    if (step === 4) {
      if (!formData.heroImage) {
        errors.heroImage = "Background image is required";
      }
    }

    // Step 5: Owner assignment (optional, but if choosing to assign, validate fields)
    if (step === 5 && formData.assignOwner) {
      if (formData.ownerType === "existing" && !formData.existingUserId) {
        errors.existingUserId = "Please select a user";
      }
      if (formData.ownerType === "new") {
        if (!formData.newOwnerName.trim()) {
          errors.newOwnerName = "Name is required";
        }
        if (!formData.newOwnerEmail.trim()) {
          errors.newOwnerEmail = "Email is required";
        } else if (!formData.newOwnerEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.newOwnerEmail = "Invalid email format";
        }
        if (!formData.newOwnerPassword.trim()) {
          errors.newOwnerPassword = "Password is required";
        } else if (formData.newOwnerPassword.length < 8) {
          errors.newOwnerPassword = "Password must be at least 8 characters";
        }
      }
    }

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

    // Final validation - check all required steps
    if (!formData.name.trim() || !formData.description.trim()) {
      setError("Basic information is required");
      setCurrentStep(1);
      return;
    }

    if (!formData.country.trim() || !formData.city.trim() || !formData.street.trim() || 
        !formData.latitude.trim() || !formData.longitude.trim()) {
      setError("Address and location are required");
      setCurrentStep(2);
      return;
    }

    if (!formData.heroImage) {
      setError("Background image is required");
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

      // Add images to metadata
      if (formData.logo) {
        metadata.logo = formData.logo.url || formData.logo.preview;
      }
      if (formData.heroImage) {
        metadata.heroImage = formData.heroImage.url || formData.heroImage.preview;
      }

      // Prepare data for submission
      const submitData = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        description: formData.description.trim(),
        address: fullAddress,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        website: formData.website.trim() || undefined,
        metadata,
      };

      const organization = await createOrganization(submitData);

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

          const assignResponse = await fetch("/api/admin/organizations/assign-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(assignPayload),
          });

          if (!assignResponse.ok) {
            const errorData = await assignResponse.json();
            throw new Error(errorData.error || "Failed to assign owner");
          }

          showToast("success", "Organization created and owner assigned successfully!");
        } catch (ownerErr) {
          // Organization was created, but owner assignment failed
          const ownerMessage = ownerErr instanceof Error ? ownerErr.message : "Failed to assign owner";
          showToast("error", `Organization created, but owner assignment failed: ${ownerMessage}`);
          
          // Still redirect to the organization page
          setTimeout(() => {
            router.push(`/admin/organizations/${organization.id}`);
          }, 2000);
          return;
        }
      } else {
        showToast("success", "Organization created successfully!");
      }

      // Redirect to the organization detail page
      setTimeout(() => {
        router.push(`/admin/organizations/${organization.id}`);
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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }
    };
  }, [searchDebounceTimer]);

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

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        // Step 1: Basic Information & Description
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Basic Information & Description</h2>
            <p className="im-stepper-section-description">
              Enter the organization name and a short description or bio. This step is mandatory.
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

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Textarea
                    label="Short Description / Bio *"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe the organization..."
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
            <h2 className="im-stepper-section-title">Organization Address</h2>
            <p className="im-stepper-section-description">
              Provide the organization&apos;s address with map coordinates for accurate location. All fields are mandatory.
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row im-stepper-row--two">
                <div className="im-stepper-field">
                  <Input
                    label="Country *"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Country"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.country && (
                    <span className="im-stepper-field-error">{fieldErrors.country}</span>
                  )}
                </div>
                <div className="im-stepper-field">
                  <Input
                    label="City *"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="City"
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
                    label="Street *"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Street address"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.street && (
                    <span className="im-stepper-field-error">{fieldErrors.street}</span>
                  )}
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
                    label="Latitude *"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="50.4501"
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
                    label="Longitude *"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="30.5234"
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
                  💡 Tip: Use a map service like Google Maps to find the exact latitude and longitude coordinates for accurate location.
                </span>
              </div>
            </div>
          </Card>
        );

      case 3:
        // Step 3: Contacts & Website / Social Media
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Contacts & Website / Social Media</h2>
            <p className="im-stepper-section-description">
              Add contact information, website, and social media links. All fields are optional.
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row im-stepper-row--two">
                <div className="im-stepper-field">
                  <Input
                    label="Organization Email"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="contact@organization.com"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.contactEmail && (
                    <span className="im-stepper-field-error">{fieldErrors.contactEmail}</span>
                  )}
                </div>
                <div className="im-stepper-field">
                  <Input
                    label="Phone Number"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="+1 234 567 8900"
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

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label="Facebook"
                    name="facebook"
                    value={formData.facebook}
                    onChange={handleInputChange}
                    placeholder="https://facebook.com/yourorganization"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label="Instagram"
                    name="instagram"
                    value={formData.instagram}
                    onChange={handleInputChange}
                    placeholder="https://instagram.com/yourorganization"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <Input
                    label="LinkedIn"
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleInputChange}
                    placeholder="https://linkedin.com/company/yourorganization"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </Card>
        );

      case 4:
        // Step 4: Images & Logo
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Images & Logo</h2>
            <p className="im-stepper-section-description">
              Upload the organization logo and background image. Background image is mandatory.
            </p>
            <div className="im-step-content">
              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <UploadField
                    label="Organization Logo"
                    value={formData.logo}
                    onChange={(file) => setFormData((prev) => ({ ...prev, logo: file }))}
                    aspectRatio="square"
                    helperText="Square image recommended for best display"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="im-stepper-row">
                <div className="im-stepper-field im-stepper-field--full">
                  <UploadField
                    label="Background Image / Banner"
                    value={formData.heroImage}
                    onChange={(file) => setFormData((prev) => ({ ...prev, heroImage: file }))}
                    aspectRatio="wide"
                    required
                    helperText="Wide image recommended for banner display"
                    disabled={isSubmitting}
                  />
                  {fieldErrors.heroImage && (
                    <span className="im-stepper-field-error">{fieldErrors.heroImage}</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
        );

      case 5:
        // Step 5: Assign Owner / SuperAdmin
        return (
          <Card className="im-stepper-section">
            <h2 className="im-stepper-section-title">Assign Owner / SuperAdmin</h2>
            <p className="im-stepper-section-description">
              Choose an existing user or create a new one to be the organization owner. You can skip this step if the owner is not yet determined.
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
                    Assign an owner to this organization
                  </label>
                </div>
              </div>

              {formData.assignOwner && (
                <>
                  <div className="im-stepper-row">
                    <div className="im-stepper-field im-stepper-field--full">
                      <label className="im-stepper-label">Owner Type</label>
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
                          Existing User
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
                          Create New User
                        </label>
                      </div>
                    </div>
                  </div>

                  {formData.ownerType === "existing" ? (
                    <div className="im-stepper-row">
                      <div className="im-stepper-field im-stepper-field--full">
                        <Input
                          label="Search User *"
                          value={userSearchQuery}
                          onChange={(e) => handleUserSearchChange(e.target.value)}
                          placeholder="Type name or email to search..."
                          disabled={isSubmitting}
                        />
                        {isSearchingUsers && (
                          <span className="im-stepper-field-hint">Searching...</span>
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
                                <div style={{ fontWeight: 500 }}>{user.name || "No name"}</div>
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
                            label="Full Name *"
                            name="newOwnerName"
                            value={formData.newOwnerName}
                            onChange={handleInputChange}
                            placeholder="John Doe"
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
                            label="Email *"
                            name="newOwnerEmail"
                            type="email"
                            value={formData.newOwnerEmail}
                            onChange={handleInputChange}
                            placeholder="john@example.com"
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
                            label="Password *"
                            name="newOwnerPassword"
                            type="password"
                            value={formData.newOwnerPassword}
                            onChange={handleInputChange}
                            placeholder="Minimum 8 characters"
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
