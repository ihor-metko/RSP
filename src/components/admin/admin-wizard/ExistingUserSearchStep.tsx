"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Input, Button } from "@/components/ui";
import type { ExistingUserData, AdminWizardErrors } from "@/types/adminWizard";

interface ExistingUserSearchStepProps {
  data: Partial<ExistingUserData>;
  onChange: (data: Partial<ExistingUserData>) => void;
  errors: AdminWizardErrors;
  disabled: boolean;
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
}

export function ExistingUserSearchStep({
  data,
  onChange,
  errors,
  disabled,
}: ExistingUserSearchStepProps) {
  const t = useTranslations("createAdminWizard.existingUserSearchStep");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchError(t("errors.enterEmail"));
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(searchQuery)) {
      setSearchError(t("errors.invalidEmail"));
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const response = await fetch(`/api/admin/users/search?email=${encodeURIComponent(searchQuery)}`);
      const result = await response.json();

      if (!response.ok) {
        setSearchError(result.error || t("errors.searchFailed"));
        return;
      }

      if (result.users && result.users.length > 0) {
        setSearchResults(result.users);
      } else {
        setSearchError(t("errors.noResults"));
      }
    } catch {
      setSearchError(t("errors.searchError"));
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, t]);

  const handleSelectUser = (user: SearchResult) => {
    onChange({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
  };

  const handleClearSelection = () => {
    onChange({
      userId: undefined,
      email: undefined,
      name: undefined,
    });
  };

  return (
    <div className="im-wizard-step-content">
      {!data.userId ? (
        <>
          <div className="im-form-field">
            <label htmlFor="userSearch" className="im-field-label">
              {t("searchLabel")}
            </label>
            <div className="im-search-field">
              <Input
                id="userSearch"
                type="email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                disabled={disabled || isSearching}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleSearch}
                disabled={disabled || isSearching || !searchQuery.trim()}
              >
                {isSearching ? t("searching") : t("searchButton")}
              </Button>
            </div>
            {searchError && (
              <span className="im-field-error" role="alert">
                {searchError}
              </span>
            )}
            {errors.userId && (
              <span className="im-field-error" role="alert">
                {errors.userId}
              </span>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="im-search-results">
              <h4 className="im-search-results-title">{t("searchResults")}</h4>
              <div className="im-search-results-list">
                {searchResults.map((user) => (
                  <div key={user.id} className="im-search-result-item">
                    <div className="im-search-result-info">
                      <div className="im-search-result-name">{user.name || t("noName")}</div>
                      <div className="im-search-result-email">{user.email}</div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSelectUser(user)}
                      disabled={disabled}
                    >
                      {t("select")}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="im-selected-user">
          <h4 className="im-selected-user-title">{t("selectedUser")}</h4>
          <div className="im-selected-user-info">
            <div className="im-review-item">
              <dt className="im-review-label">{t("name")}</dt>
              <dd className="im-review-value">{data.name || t("noName")}</dd>
            </div>
            <div className="im-review-item">
              <dt className="im-review-label">{t("email")}</dt>
              <dd className="im-review-value">{data.email}</dd>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleClearSelection}
            disabled={disabled}
          >
            {t("changeUser")}
          </Button>
        </div>
      )}
    </div>
  );
}
