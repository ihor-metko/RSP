"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui";
import type { SimpleUser } from "@/types/adminUser";

const MIN_SEARCH_LENGTH = 2;

export interface UserSearchDropdownProps {
  onSelect: (userId: string) => void;
  users: SimpleUser[];
  onSearchChange: (query: string) => void;
  isSearching?: boolean;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  getUserDisabledInfo?: (user: SimpleUser) => { disabled: boolean; reason?: string };
  translationPrefix?: string;
}

export function UserSearchDropdown({
  onSelect,
  users,
  onSearchChange,
  isSearching = false,
  placeholder,
  label,
  disabled = false,
  getUserDisabledInfo,
  translationPrefix = "clubAdmins",
}: UserSearchDropdownProps) {
  const t = useTranslations(translationPrefix);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchQuery(newValue);
      setFocusedIndex(-1);
      onSearchChange(newValue);
      setShowDropdown(true);
    },
    [onSearchChange]
  );

  // Handle user selection
  const handleSelectUser = useCallback(
    (user: SimpleUser) => {
      // Check if user should be disabled
      if (getUserDisabledInfo) {
        const disabledInfo = getUserDisabledInfo(user);
        if (disabledInfo.disabled) {
          return;
        }
      }

      onSelect(user.id);
      setSearchQuery("");
      setShowDropdown(false);
      setFocusedIndex(-1);
    },
    [onSelect, getUserDisabledInfo]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown":
          if (showDropdown && users.length > 0) {
            e.preventDefault();
            setFocusedIndex((prev) => (prev < users.length - 1 ? prev + 1 : prev));
          }
          break;
        case "ArrowUp":
          if (showDropdown && users.length > 0) {
            e.preventDefault();
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          }
          break;
        case "Enter":
          if (showDropdown && users.length > 0) {
            e.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < users.length) {
              handleSelectUser(users[focusedIndex]);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowDropdown(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [showDropdown, users, focusedIndex, handleSelectUser]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target)
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

  return (
    <div className="im-form-field">
      {label && (
        <label htmlFor="userSearch" className="im-field-label">
          {label}
        </label>
      )}
      <div className="im-autocomplete-wrapper">
        <Input
          ref={inputRef}
          id="userSearch"
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
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
        {showDropdown && users.length > 0 && (
          <div
            ref={dropdownRef}
            id="user-search-results"
            className="im-autocomplete-dropdown"
            role="listbox"
          >
            {users.map((user, index) => {
              const disabledInfo = getUserDisabledInfo
                ? getUserDisabledInfo(user)
                : { disabled: false };
              return (
                <div
                  key={user.id}
                  role="option"
                  aria-selected={index === focusedIndex}
                  aria-disabled={disabledInfo.disabled}
                  className={`im-autocomplete-item ${
                    index === focusedIndex ? "im-focused" : ""
                  } ${disabledInfo.disabled ? "im-autocomplete-item--disabled" : ""}`}
                  onClick={() => handleSelectUser(user)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  title={disabledInfo.reason}
                >
                  <div className="im-autocomplete-item-content">
                    <div className="im-autocomplete-item-name">
                      {user.name || user.email}
                    </div>
                    <div className="im-autocomplete-item-email">{user.email}</div>
                    {disabledInfo.disabled && disabledInfo.reason && (
                      <div className="im-autocomplete-item-role-indicator">
                        {disabledInfo.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {showDropdown && users.length === 0 && searchQuery.length >= MIN_SEARCH_LENGTH && !isSearching && (
          <div ref={dropdownRef} className="im-autocomplete-dropdown">
            <div className="im-autocomplete-item im-autocomplete-item--disabled">
              {t("noUsersFound")}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
