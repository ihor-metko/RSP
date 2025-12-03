"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Roles, type UserRole } from "@/constants/roles";
import "./UserMenu.css";

/**
 * Outline icon components for the user menu
 * Uses consistent 18-20px sizing with color: var(--im-icon-color)
 * 
 * ARIA: Icons are decorative (aria-hidden="true")
 */

function UserIcon() {
  return (
    <svg
      className="im-user-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="im-user-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="im-user-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg
      className="im-user-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronDownIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      className={`im-user-menu-chevron ${isOpen ? "im-user-menu-chevron--open" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="im-user-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export interface UserMenuProps {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
  userRole: UserRole | undefined;
}

/**
 * Get user initials from name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * UserMenu Component
 * 
 * Accessible dropdown menu for authenticated users.
 * Shows user avatar with initials and a chevron.
 * 
 * ACCESSIBILITY:
 * - Uses button + aria-expanded, aria-controls for toggle
 * - role="menu" and role="menuitem" semantics
 * - Keyboard navigation: Enter/Space opens, Escape closes, Arrow keys navigate
 * - Focus ring using outline: 2px solid var(--im-primary)
 * 
 * For players: No role is displayed in the header or menu
 * For admins: Shows admin badge in dropdown
 */
export default function UserMenu({ userName, userEmail, userRole }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations();
  const menuId = "im-user-menu-dropdown";

  // Close menu when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Handle keyboard navigation for toggle button
  const handleButtonKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        setIsOpen((prev) => !prev);
        break;
      case "ArrowDown":
        if (isOpen) {
          event.preventDefault();
          // Focus first menu item
          const firstItem = menuListRef.current?.querySelector('[role="menuitem"]') as HTMLElement;
          firstItem?.focus();
        }
        break;
    }
  };

  // Handle keyboard navigation within menu
  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    const menuItems = menuListRef.current?.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>;
    const currentIndex = Array.from(menuItems).findIndex((item) => item === document.activeElement);

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (currentIndex < menuItems.length - 1) {
          menuItems[currentIndex + 1]?.focus();
        } else {
          menuItems[0]?.focus();
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (currentIndex > 0) {
          menuItems[currentIndex - 1]?.focus();
        } else {
          menuItems[menuItems.length - 1]?.focus();
        }
        break;
      case "Home":
        event.preventDefault();
        menuItems[0]?.focus();
        break;
      case "End":
        event.preventDefault();
        menuItems[menuItems.length - 1]?.focus();
        break;
      case "Tab":
        // Close menu on tab out
        setIsOpen(false);
        break;
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setIsOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  const isAdmin = userRole === Roles.SuperAdmin;

  return (
    <div className="im-user-menu" ref={menuRef}>
      {/* Avatar button - triggers dropdown */}
      <button
        ref={buttonRef}
        className="im-user-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleButtonKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={t("common.actions") + " - " + (userName || userEmail)}
      >
        <div className="im-user-menu-avatar" aria-hidden="true">
          {getInitials(userName)}
        </div>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          id={menuId}
          className="im-user-menu-dropdown"
          role="menu"
          aria-label={t("playerDashboard.navigation.title")}
          ref={menuListRef}
          onKeyDown={handleMenuKeyDown}
        >
          {/* User info section */}
          <div className="im-user-menu-header">
            <p className="im-user-menu-name">{userName || userEmail}</p>
            <p className="im-user-menu-email">{userEmail}</p>
            {/* Show admin badge only for admin users */}
            {isAdmin && (
              <span className="im-user-menu-admin-badge">
                <ShieldIcon />
                Admin
              </span>
            )}
          </div>

          <div className="im-user-menu-separator" role="separator" />

          {/* Menu items - aria-label omitted when visible text is sufficient */}
          <Link
            href="/profile"
            className="im-user-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <UserIcon />
            <span>{t("playerDashboard.navigation.profile")}</span>
          </Link>

          <Link
            href="/bookings"
            className="im-user-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <CalendarIcon />
            <span>{t("training.history.title")}</span>
          </Link>

          <Link
            href="/settings"
            className="im-user-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <SettingsIcon />
            <span>{t("common.settings") || "Settings"}</span>
          </Link>

          <div className="im-user-menu-separator" role="separator" />

          {/* Logout button - aria-label omitted when visible text is sufficient */}
          <button
            className="im-user-menu-item im-user-menu-item--logout"
            role="menuitem"
            tabIndex={0}
            onClick={handleLogout}
          >
            <LogOutIcon />
            <span>{t("common.signOut")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
