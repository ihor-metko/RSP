"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { IMLink } from "@/components/ui/IMLink";
import { Button, Input, Card } from "@/components/ui";
import { UploadField } from "./UploadField.client";
import { BusinessHoursField } from "./BusinessHoursField.client";
import { InlineCourtsField } from "./InlineCourtsField.client";
import "./ClubForm.css";

interface UploadedFile {
  url: string;
  key: string;
  file?: File;
  preview?: string;
}

interface BusinessHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface InlineCourt {
  id: string;
  name: string;
  type: string;
  surface: string;
  indoor: boolean;
  defaultPriceCents: number;
}

interface ClubFormData {
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  location: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
  website: string;
  socialLinks: string;
  defaultCurrency: string;
  timezone: string;
  isPublic: boolean;
  tags: string;
  heroImage: UploadedFile | null;
  logo: UploadedFile | null;
  gallery: UploadedFile[];
  businessHours: BusinessHour[];
  courts: InlineCourt[];
}

const initialBusinessHours: BusinessHour[] = [
  { dayOfWeek: 0, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 1, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 2, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 3, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 4, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 5, openTime: "09:00", closeTime: "21:00", isClosed: false },
  { dayOfWeek: 6, openTime: "10:00", closeTime: "20:00", isClosed: false },
];

const initialFormData: ClubFormData = {
  name: "Padel Pulse Arena",
  slug: "",
  shortDescription: "Сучасний падел-клуб у центрі міста з професійними кортами і тренерською командою.",
  longDescription: "Padel Pulse Arena — сучасний падел-клуб з критими та відкритими кортами, зручною лаунж-зоною та програмами для новачків і профі. Пропонуємо індивідуальні та групові тренування, оренду інвентарю та корпоративні заходи.",
  location: "вул. Спортивна 12, Київ",
  city: "Київ",
  country: "Україна",
  latitude: "50.4501",
  longitude: "30.5234",
  phone: "+380671234567",
  email: "info@paddlepulse.ua",
  website: "https://paddlepulse.ua",
  socialLinks: "{\"instagram\":\"https://instagram.com/paddlepulse.kyiv\",\"facebook\":\"https://facebook.com/paddlepulse.kyiv\"}",
  defaultCurrency: "UAH",
  timezone: "Europe/Kiev",
  isPublic: true,
  tags: "[\"padel\",\"indoor\",\"training\"]",
  heroImage: null,
  logo: null,
  gallery: [],
  businessHours: initialBusinessHours,
  courts: [],
};

export function ClubForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<ClubFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [fieldErrors]);

  const handleImageChange = useCallback((field: "heroImage" | "logo") => (file: UploadedFile | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));
  }, []);

  const handleGalleryChange = useCallback((files: UploadedFile[]) => {
    setFormData((prev) => ({
      ...prev,
      gallery: files,
    }));
  }, []);

  const handleBusinessHoursChange = useCallback((hours: BusinessHour[]) => {
    setFormData((prev) => ({
      ...prev,
      businessHours: hours,
    }));
  }, []);

  const handleCourtsChange = useCallback((courts: InlineCourt[]) => {
    setFormData((prev) => ({
      ...prev,
      courts: courts,
    }));
  }, []);

  const generateSlug = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Club name is required";
    }
    if (!formData.shortDescription.trim()) {
      errors.shortDescription = "Short description is required";
    }
    if (!formData.location.trim()) {
      errors.location = "Address is required";
    }
    if (!formData.heroImage) {
      errors.heroImage = "Hero image is required";
    }
    if (!formData.logo) {
      errors.logo = "Logo is required";
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Invalid email format";
    }
    if (formData.latitude && isNaN(parseFloat(formData.latitude))) {
      errors.latitude = "Must be a valid number";
    }
    if (formData.longitude && isNaN(parseFloat(formData.longitude))) {
      errors.longitude = "Must be a valid number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload images first
      let heroImageData = { url: "", key: "" };
      let logoData = { url: "", key: "" };
      const galleryData: { url: string; key: string }[] = [];

      if (formData.heroImage?.file) {
        heroImageData = await uploadFile(formData.heroImage.file);
      } else if (formData.heroImage?.url) {
        heroImageData = { url: formData.heroImage.url, key: formData.heroImage.key };
      }

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
        name: formData.name.trim(),
        slug: formData.slug.trim() || generateSlug(formData.name),
        shortDescription: formData.shortDescription.trim(),
        longDescription: formData.longDescription.trim(),
        location: formData.location.trim(),
        city: formData.city.trim() || null,
        country: formData.country.trim() || null,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        website: formData.website.trim() || null,
        socialLinks: formData.socialLinks.trim() || null,
        defaultCurrency: formData.defaultCurrency,
        timezone: formData.timezone,
        isPublic: formData.isPublic,
        tags: formData.tags.trim() || null,
        heroImage: heroImageData.url,
        logo: logoData.url,
        gallery: galleryData,
        businessHours: formData.businessHours,
        courts: formData.courts.map((court) => ({
          name: court.name,
          type: court.type || null,
          surface: court.surface || null,
          indoor: court.indoor,
          defaultPriceCents: court.defaultPriceCents,
        })),
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
          throw new Error("Slug conflict: Please choose a different slug");
        }
        throw new Error(data.error || "Failed to create club");
      }

      // Redirect to the club detail page
      router.push(`/admin/clubs/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create club");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/admin/clubs");
  };

  return (
    <form onSubmit={handleSubmit} className="im-club-form">
      {/* Header with breadcrumb and actions */}
      <div className="im-club-form-header">
        <div className="im-club-form-breadcrumb">
          <IMLink href="/admin/clubs" className="im-club-form-breadcrumb-link">
            Clubs
          </IMLink>
          <span className="im-club-form-breadcrumb-separator">/</span>
          <span className="im-club-form-breadcrumb-current">New Club</span>
        </div>
        <div className="im-club-form-actions">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Club"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="im-club-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="im-club-form-content">
        {/* Basic Info Section */}
        <Card className="im-club-form-section">
          <h2 className="im-club-form-section-title">Basic Information</h2>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <Input
                label="Club Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter club name"
                required
                disabled={isSubmitting}
              />
              {fieldErrors.name && (
                <span className="im-club-form-field-error">{fieldErrors.name}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field">
              <Input
                label="Slug (optional)"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                placeholder="club-name-slug"
                disabled={isSubmitting}
              />
              <span className="im-club-form-field-hint">
                Auto-generated from name if empty
              </span>
              {fieldErrors.slug && (
                <span className="im-club-form-field-error">{fieldErrors.slug}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <Input
                label="Short Description"
                name="shortDescription"
                value={formData.shortDescription}
                onChange={handleInputChange}
                placeholder="Brief description of the club"
                required
                disabled={isSubmitting}
              />
              {fieldErrors.shortDescription && (
                <span className="im-club-form-field-error">{fieldErrors.shortDescription}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <label className="im-club-form-label">Long Description</label>
              <textarea
                name="longDescription"
                value={formData.longDescription}
                onChange={handleInputChange}
                placeholder="Detailed description of the club..."
                className="im-club-form-textarea"
                rows={5}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </Card>

        {/* Location & Contact Section */}
        <Card className="im-club-form-section">
          <h2 className="im-club-form-section-title">Location &amp; Contact</h2>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <Input
                label="Address"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Full address"
                required
                disabled={isSubmitting}
              />
              {fieldErrors.location && (
                <span className="im-club-form-field-error">{fieldErrors.location}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row im-club-form-row--two">
            <div className="im-club-form-field">
              <Input
                label="City"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City"
                disabled={isSubmitting}
              />
            </div>
            <div className="im-club-form-field">
              <Input
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                placeholder="Country"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="im-club-form-row im-club-form-row--two">
            <div className="im-club-form-field">
              <Input
                label="Latitude"
                name="latitude"
                value={formData.latitude}
                onChange={handleInputChange}
                placeholder="e.g., 40.7128"
                disabled={isSubmitting}
              />
              {fieldErrors.latitude && (
                <span className="im-club-form-field-error">{fieldErrors.latitude}</span>
              )}
            </div>
            <div className="im-club-form-field">
              <Input
                label="Longitude"
                name="longitude"
                value={formData.longitude}
                onChange={handleInputChange}
                placeholder="e.g., -74.0060"
                disabled={isSubmitting}
              />
              {fieldErrors.longitude && (
                <span className="im-club-form-field-error">{fieldErrors.longitude}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row im-club-form-row--two">
            <div className="im-club-form-field">
              <Input
                label="Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="+1 (555) 123-4567"
                disabled={isSubmitting}
              />
            </div>
            <div className="im-club-form-field">
              <Input
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contact@club.com"
                disabled={isSubmitting}
              />
              {fieldErrors.email && (
                <span className="im-club-form-field-error">{fieldErrors.email}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <Input
                label="Website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://www.club.com"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <Input
                label="Social Links"
                name="socialLinks"
                value={formData.socialLinks}
                onChange={handleInputChange}
                placeholder="Twitter, Instagram, Facebook URLs"
                disabled={isSubmitting}
              />
              <span className="im-club-form-field-hint">
                Comma-separated URLs or JSON format
              </span>
            </div>
          </div>
        </Card>

        {/* Business Hours Section */}
        <Card className="im-club-form-section">
          <h2 className="im-club-form-section-title">Business Hours</h2>
          <BusinessHoursField
            value={formData.businessHours}
            onChange={handleBusinessHoursChange}
            disabled={isSubmitting}
          />
        </Card>

        {/* Images & Media Section */}
        <Card className="im-club-form-section">
          <h2 className="im-club-form-section-title">Images &amp; Media</h2>

          <div className="im-club-form-row im-club-form-row--two">
            <div className="im-club-form-field">
              <UploadField
                label="Hero Image (Desktop)"
                value={formData.heroImage}
                onChange={handleImageChange("heroImage")}
                required
                aspectRatio="wide"
                helperText="Recommended: 1920x1080 or similar 16:9 ratio"
                disabled={isSubmitting}
              />
              {fieldErrors.heroImage && (
                <span className="im-club-form-field-error">{fieldErrors.heroImage}</span>
              )}
            </div>
            <div className="im-club-form-field">
              <UploadField
                label="Logo (Square)"
                value={formData.logo}
                onChange={handleImageChange("logo")}
                required
                aspectRatio="square"
                helperText="Recommended: 512x512 square image (SVG supported)"
                disabled={isSubmitting}
                allowSVG={true}
              />
              {fieldErrors.logo && (
                <span className="im-club-form-field-error">{fieldErrors.logo}</span>
              )}
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <GalleryField
                label="Gallery Images (Optional)"
                value={formData.gallery}
                onChange={handleGalleryChange}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </Card>

        {/* Courts Section */}
        <Card className="im-club-form-section">
          <h2 className="im-club-form-section-title">Courts (Optional)</h2>
          <p className="im-club-form-section-hint">
            Add courts now or create them later from the club detail page.
          </p>
          <InlineCourtsField
            value={formData.courts}
            onChange={handleCourtsChange}
            disabled={isSubmitting}
          />
        </Card>

        {/* Settings Section */}
        <Card className="im-club-form-section">
          <h2 className="im-club-form-section-title">Settings</h2>

          <div className="im-club-form-row im-club-form-row--two">
            <div className="im-club-form-field">
              <Input
                label="Default Currency"
                name="defaultCurrency"
                value={formData.defaultCurrency}
                onChange={handleInputChange}
                placeholder="UAH"
                disabled={isSubmitting}
              />
            </div>
            <div className="im-club-form-field">
              <Input
                label="Time Zone"
                name="timezone"
                value={formData.timezone}
                onChange={handleInputChange}
                placeholder="UTC"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field im-club-form-field--full">
              <Input
                label="Tags / Categories"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                placeholder="padel, tennis, indoor, outdoor"
                disabled={isSubmitting}
              />
              <span className="im-club-form-field-hint">
                Comma-separated tags for categorization
              </span>
            </div>
          </div>

          <div className="im-club-form-row">
            <div className="im-club-form-field">
              <label className="im-club-form-checkbox-wrapper">
                <input
                  type="checkbox"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  className="im-club-form-checkbox"
                />
                <span className="im-club-form-checkbox-label">
                  Public visibility (publish club)
                </span>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </form>
  );
}

// Gallery Field Component
interface GalleryFieldProps {
  label: string;
  value: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  disabled?: boolean;
}

function GalleryField({ label, value, onChange, disabled }: GalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems: UploadedFile[] = files.map((file) => ({
      url: "",
      key: "",
      file,
      preview: URL.createObjectURL(file),
    }));
    onChange([...value, ...newItems]);
  };

  const handleRemove = (index: number) => {
    const item = value[index];
    if (item.preview) {
      URL.revokeObjectURL(item.preview);
    }
    const newValue = value.filter((_, i) => i !== index);
    onChange(newValue);
  };

  return (
    <div className="im-gallery-field">
      <label className="im-upload-field-label">{label}</label>

      <div className="im-gallery-field-grid">
        {value.map((item, index) => (
          <div key={index} className="im-gallery-field-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.preview || item.url}
              alt={`Gallery image ${index + 1}`}
              className="im-gallery-field-image"
            />
            <button
              type="button"
              className="im-gallery-field-remove"
              onClick={() => handleRemove(index)}
              disabled={disabled}
              aria-label={`Remove gallery image ${index + 1}`}
            >
              ✕
            </button>
          </div>
        ))}

        <button
          type="button"
          className="im-gallery-field-add"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          <span className="im-gallery-field-add-icon">+</span>
          <span>Add Image</span>
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileSelect}
        className="im-upload-field-input"
        disabled={disabled}
      />
    </div>
  );
}
