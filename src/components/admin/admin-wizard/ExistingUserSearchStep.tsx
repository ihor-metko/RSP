"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import { SelectedUserCard } from "./SelectedUserCard";
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
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    // Don't search for queries shorter than 2 characters
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
      const result = await response.json();

      if (!response.ok) {
        console.error("Search failed:", result.error);
        setSearchResults([]);
        return;
      }

      if (result.users && result.users.length > 0) {
        setSearchResults(result.users);
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setFocusedIndex(-1);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300); // 300ms debounce
  }, [performSearch]);

  // Handle user selection
  const handleSelectUser = useCallback((user: SearchResult) => {
    onChange({
      userId: user.id,
      email: user.email,
      name: user.name,
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    setFocusedIndex(-1);
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        if (showDropdown && searchResults.length > 0) {
          e.preventDefault();
          setFocusedIndex((prev) => 
            prev < searchResults.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        if (showDropdown && searchResults.length > 0) {
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case "Enter":
        if (showDropdown && searchResults.length > 0) {
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
            handleSelectUser(searchResults[focusedIndex]);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  }, [showDropdown, searchResults, focusedIndex, handleSelectUser]);

  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    onChange({
      userId: undefined,
      email: undefined,
      name: undefined,
    });
  }, [onChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="im-wizard-step-content">
      {!data.userId ? (
        <>
          <div className="im-registration-notice" role="status" aria-live="polite">
            {t("registrationNotice")}
          </div>
          <div className="im-form-field">
            <label htmlFor="userSearch" className="im-field-label">
              {t("searchLabel")}
            </label>
            <div className="im-autocomplete-wrapper">
              <Input
                ref={inputRef}
                id="userSearch"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={t("searchPlaceholder")}
                disabled={disabled}
                autoComplete="off"
                aria-autocomplete="list"
                aria-controls="user-search-results"
                aria-expanded={showDropdown}
              />
              {isSearching && (
                <span className="im-autocomplete-loading" aria-live="polite">
                  {t("searching")}
                </span>
              )}
              {showDropdown && searchResults.length > 0 && (
                <div
                  ref={dropdownRef}
                  id="user-search-results"
                  className="im-autocomplete-dropdown"
                  role="listbox"
                >
                  {searchResults.map((user, index) => (
                    <div
                      key={user.id}
                      role="option"
                      aria-selected={index === focusedIndex}
                      className={`im-autocomplete-item ${index === focusedIndex ? "im-focused" : ""}`}
                      onClick={() => handleSelectUser(user)}
                      onMouseEnter={() => setFocusedIndex(index)}
                    >
                      <div className="im-autocomplete-item-name">
                        {user.name || t("noName")}
                      </div>
                      <div className="im-autocomplete-item-email">{user.email}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {errors.userId && (
              <span className="im-field-error" role="alert">
                {errors.userId}
              </span>
            )}
          </div>
        </>
      ) : (
        <SelectedUserCard
          name={data.name}
          email={data.email}
          onChangeUser={handleClearSelection}
          disabled={disabled}
        />
      )}
    </div>
  );
}
