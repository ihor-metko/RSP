"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { Input, Select, Textarea, Checkbox } from "@/components/ui";
import type { SelectOption } from "@/components/ui";

const CLUB_TYPES: SelectOption[] = [{ value: "padel", label: "Padel" }];

export interface OrganizationOption {
  id: string;
  name: string;
  slug: string;
}

export interface GeneralInfoData {
  name: string;
  slug: string;
  clubType: string;
  shortDescription: string;
  isPublic?: boolean;
  organizationId?: string;
}

interface GeneralInfoStepProps {
  data: GeneralInfoData;
  onChange: (data: Partial<GeneralInfoData>) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
  showPublicToggle?: boolean;
  /** Organization context for the form */
  organizationContext?: {
    /** Whether the organization field is editable (true for root admin) */
    isEditable: boolean;
    /** Prefilled organization for org admins */
    prefilledOrg?: OrganizationOption | null;
    /** Loading state for organization search */
    isLoading?: boolean;
    /** Available organizations for dropdown (for root admin) */
    organizations?: OrganizationOption[];
    /** Search handler for typeahead */
    onSearch?: (query: string) => void;
  };
}

export function GeneralInfoStep({
  data,
  onChange,
  errors = {},
  disabled = false,
  showPublicToggle = false,
  organizationContext,
}: GeneralInfoStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for organizations
  // We only want to re-run when searchQuery changes, not the full organizationContext
  useEffect(() => {
    if (!organizationContext?.isEditable || !organizationContext?.onSearch) return;
    
    const timer = setTimeout(() => {
      organizationContext.onSearch?.(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, organizationContext?.isEditable, organizationContext?.onSearch]);

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      onChange({ [name]: type === "checkbox" ? checked : value });
    },
    [onChange]
  );

  const handleOrgSelect = useCallback((org: OrganizationOption) => {
    onChange({ organizationId: org.id });
    setSearchQuery(org.name);
    setIsDropdownOpen(false);
  }, [onChange]);

  const handleOrgSearchInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsDropdownOpen(true);
    // Clear selection if search query is modified
    if (data.organizationId) {
      onChange({ organizationId: "" });
    }
  }, [data.organizationId, onChange]);

  // Get the selected organization name for display
  const getSelectedOrgName = useCallback(() => {
    if (organizationContext?.prefilledOrg) {
      return `${organizationContext.prefilledOrg.name} (${organizationContext.prefilledOrg.slug})`;
    }
    if (data.organizationId && organizationContext?.organizations) {
      const selected = organizationContext.organizations.find(org => org.id === data.organizationId);
      return selected ? selected.name : "";
    }
    return searchQuery;
  }, [organizationContext, data.organizationId, searchQuery]);

  // Render organization selector based on user type
  const renderOrganizationField = () => {
    if (!organizationContext) return null;

    const { isEditable, prefilledOrg, isLoading, organizations } = organizationContext;

    // For organization admins: show disabled field with prefilled org
    if (!isEditable && prefilledOrg) {
      return (
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Input
              label="Organization *"
              name="organization"
              value={getSelectedOrgName()}
              onChange={() => {}}
              disabled={true}
              data-testid="organization-input"
            />
            <span className="im-stepper-field-hint im-org-context-hint">
              This club will be created under Organization: <strong>{prefilledOrg.name}</strong>
            </span>
          </div>
        </div>
      );
    }

    // For root admins: show searchable typeahead
    if (isEditable) {
      return (
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full" ref={dropdownRef}>
            <label className="im-stepper-label">Organization *</label>
            <div className="im-org-selector">
              <input
                ref={inputRef}
                type="text"
                className="im-stepper-input im-org-search-input"
                placeholder="Search organizations..."
                value={data.organizationId ? getSelectedOrgName() : searchQuery}
                onChange={handleOrgSearchInput}
                onFocus={() => setIsDropdownOpen(true)}
                disabled={disabled}
                data-testid="organization-search-input"
              />
              {isLoading && (
                <span className="im-org-loading">Loading...</span>
              )}
              {isDropdownOpen && organizations && organizations.length > 0 && (
                <ul className="im-org-dropdown" data-testid="organization-dropdown">
                  {organizations.map((org) => (
                    <li
                      key={org.id}
                      className={`im-org-dropdown-item ${data.organizationId === org.id ? "im-org-dropdown-item--selected" : ""}`}
                      onClick={() => handleOrgSelect(org)}
                      data-testid={`org-option-${org.id}`}
                    >
                      <span className="im-org-dropdown-name">{org.name}</span>
                      <span className="im-org-dropdown-slug">{org.slug}</span>
                    </li>
                  ))}
                </ul>
              )}
              {isDropdownOpen && organizations && organizations.length === 0 && searchQuery && !isLoading && (
                <div className="im-org-dropdown im-org-dropdown--empty">
                  No organizations found
                </div>
              )}
            </div>
            {errors.organizationId && (
              <span className="im-stepper-field-error">{errors.organizationId}</span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="im-step-content">
      {/* Organization selector at the top of the form */}
      {renderOrganizationField()}

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Input
            label="Club Name *"
            name="name"
            value={data.name}
            onChange={handleInputChange}
            placeholder="Enter club name"
            disabled={disabled}
          />
          {errors.name && (
            <span className="im-stepper-field-error">{errors.name}</span>
          )}
        </div>
      </div>

      <div className="im-stepper-row im-stepper-row--two">
        <div className="im-stepper-field">
          <Input
            label="Slug (optional)"
            name="slug"
            value={data.slug}
            onChange={handleInputChange}
            placeholder="club-name-slug"
            disabled={disabled}
          />
          <span className="im-stepper-field-hint">
            Auto-generated from name if empty
          </span>
          {errors.slug && (
            <span className="im-stepper-field-error">{errors.slug}</span>
          )}
        </div>
        <div className="im-stepper-field">
          <Select
            label="Club Type"
            options={CLUB_TYPES}
            placeholder="Select type..."
            value={data.clubType}
            onChange={(value) => onChange({ clubType: value })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="im-stepper-row">
        <div className="im-stepper-field im-stepper-field--full">
          <Textarea
            label="Short Description"
            name="shortDescription"
            value={data.shortDescription}
            onChange={handleInputChange}
            placeholder="Brief description of the club..."
            rows={3}
            disabled={disabled}
          />
        </div>
      </div>

      {showPublicToggle && (
        <div className="im-stepper-row">
          <div className="im-stepper-field im-stepper-field--full">
            <Checkbox
              name="isPublic"
              label="Publish club (visible to public)"
              checked={data.isPublic || false}
              onChange={handleInputChange}
              disabled={disabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}
