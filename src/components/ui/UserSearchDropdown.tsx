"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Portal } from "./Portal";
import { useDropdownPosition } from "@/hooks/useDropdownPosition";
import { Input } from "./Input";
import type { SimpleUser } from "@/types/adminUser";
import "./UserSearchDropdown.css";

export interface UserSearchDropdownProps {
  /** Label for the search input */
  label?: string;
  /** Placeholder text for search input */
  placeholder?: string;
  /** Current search query */
  searchQuery: string;
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** List of users to display in dropdown */
  users: SimpleUser[];
  /** Currently selected user ID */
  selectedUserId: string;
  /** Callback when user is selected */
  onUserSelect: (userId: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Whether search is in progress */
  isSearching?: boolean;
  /** Function to determine if a user should be disabled and why */
  getUserDisabledInfo?: (user: SimpleUser) => { disabled: boolean; reason?: string };
  /** Message to show when no users are found */
  emptyMessage?: string;
  /** Custom class name */
  className?: string;
}

/**
 * Reusable user search dropdown component with overlay positioning.
 * 
 * Features:
 * - Autocomplete search with debouncing
 * - Portal-based dropdown overlay for proper z-index positioning
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Disabled users with visual indicators
 * - Dark theme support with im-* classes
 * - Accessibility support (ARIA attributes)
 * 
 * @example
 * ```tsx
 * <UserSearchDropdown
 *   label="Search Users"
 *   placeholder="Type to search..."
 *   searchQuery={query}
 *   onSearchChange={setQuery}
 *   users={userList}
 *   selectedUserId={selected}
 *   onUserSelect={setSelected}
 *   getUserDisabledInfo={(user) => ({
 *     disabled: user.roles.length > 0,
 *     reason: "User already has a role"
 *   })}
 * />
 * ```
 */
export function UserSearchDropdown({
  label,
  placeholder = "Search users...",
  searchQuery,
  onSearchChange,
  users,
  selectedUserId,
  onUserSelect,
  disabled = false,
  isSearching = false,
  getUserDisabledInfo,
  emptyMessage = "No users found",
  className = "",
}: UserSearchDropdownProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Calculate dropdown position using the same hook as Select component
  const dropdownPosition = useDropdownPosition({
    triggerRef: wrapperRef,
    isOpen: showDropdown && users.length > 0,
    offset: 4,
    maxHeight: 300,
    matchWidth: true,
  });

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
    setFocusedIndex(-1);
    
    // Show dropdown if we have results
    if (value.trim().length > 0 && users.length > 0) {
      setShowDropdown(true);
    }
  }, [onSearchChange, users.length]);

  // Handle user selection
  const handleSelectUser = useCallback((user: SimpleUser) => {
    // Check if user should be disabled
    const disabledInfo = getUserDisabledInfo?.(user);
    if (disabledInfo?.disabled) {
      return; // Don't allow selection of disabled users
    }

    onUserSelect(user.id);
    setShowDropdown(false);
    setFocusedIndex(-1);
  }, [onUserSelect, getUserDisabledInfo]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        if (showDropdown && users.length > 0) {
          e.preventDefault();
          setFocusedIndex((prev) => 
            prev < users.length - 1 ? prev + 1 : prev
          );
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
  }, [showDropdown, users, focusedIndex, handleSelectUser]);

  // Show dropdown when users list changes and we have a search query
  useEffect(() => {
    if (searchQuery.trim().length > 0 && users.length > 0) {
      setShowDropdown(true);
    } else if (users.length === 0) {
      setShowDropdown(false);
    }
  }, [users.length, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isOutsideWrapper = wrapperRef.current && !wrapperRef.current.contains(target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      
      if (isOutsideWrapper && isOutsideDropdown) {
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

  // Scroll focused option into view
  useEffect(() => {
    if (showDropdown && focusedIndex >= 0 && dropdownRef.current) {
      const focusedElement = dropdownRef.current.children[focusedIndex] as HTMLElement;
      focusedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [focusedIndex, showDropdown]);

  return (
    <div className={`im-user-search-wrapper ${className}`.trim()} ref={wrapperRef}>
      <div className="im-user-search-input-wrapper">
        <Input
          ref={inputRef}
          label={label}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls="user-search-dropdown"
          aria-expanded={showDropdown}
        />
        {isSearching && (
          <span className="im-user-search-loading" aria-live="polite">
            Searching...
          </span>
        )}
      </div>

      {showDropdown && dropdownPosition && users.length > 0 && (
        <Portal>
          <div
            ref={dropdownRef}
            id="user-search-dropdown"
            className="im-user-search-dropdown"
            role="listbox"
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              maxHeight: `${dropdownPosition.maxHeight}px`,
            }}
          >
            {users.map((user, index) => {
              const disabledInfo = getUserDisabledInfo?.(user) ?? { disabled: false };
              const isSelected = selectedUserId === user.id;
              const isFocused = index === focusedIndex;
              
              return (
                <div
                  key={user.id}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={disabledInfo.disabled}
                  className={`im-user-search-option ${
                    isFocused ? "im-user-search-option--focused" : ""
                  } ${isSelected ? "im-user-search-option--selected" : ""} ${
                    disabledInfo.disabled ? "im-user-search-option--disabled" : ""
                  }`}
                  onClick={() => handleSelectUser(user)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  title={disabledInfo.reason}
                >
                  <div className="im-user-search-option-content">
                    <div className="im-user-search-option-name">
                      {user.name || user.email}
                    </div>
                    <div className="im-user-search-option-email">
                      {user.email}
                    </div>
                    {disabledInfo.disabled && disabledInfo.reason && (
                      <div className="im-user-search-option-role-indicator">
                        {disabledInfo.reason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Portal>
      )}
      
      {searchQuery.trim().length > 0 && users.length === 0 && !isSearching && (
        <div className="im-user-search-empty">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
