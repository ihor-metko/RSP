"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import "./RootAdminMenu.css";

/**
 * Outline icon components for the root admin menu
 * Uses consistent 18-20px sizing with color: var(--im-icon-color)
 *
 * ARIA: Icons are decorative (aria-hidden="true")
 */

function ShieldIcon() {
  return (
    <svg
      className="im-root-admin-menu-icon"
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

function DashboardIcon() {
  return (
    <svg
      className="im-root-admin-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ClubsIcon() {
  return (
    <svg
      className="im-root-admin-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="im-root-admin-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SuperAdminsIcon() {
  return (
    <svg
      className="im-root-admin-menu-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 12l-4 4-2-2" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="im-root-admin-menu-icon"
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
      className="im-root-admin-menu-icon"
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
      className={`im-root-admin-menu-chevron ${isOpen ? "im-root-admin-menu-chevron--open" : ""}`}
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

export interface RootAdminMenuProps {
  userName: string | null | undefined;
  userEmail: string | null | undefined;
}

/**
 * Get user initials from name
 */
function getInitials(name: string | null | undefined): string {
  if (!name) return "RA";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return "RA";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * RootAdminMenu Component
 *
 * Navigation panel exclusively for Root Admin users.
 * Features a distinguished avatar trigger with a dropdown panel containing
 * administrative menu items.
 *
 * ACCESSIBILITY:
 * - Uses button + aria-expanded, aria-controls for toggle
 * - role="menu" and role="menuitem" semantics
 * - Keyboard navigation: Enter/Space opens, Escape closes, Arrow keys navigate
 * - Focus ring using outline: 2px solid var(--im-primary)
 *
 * STYLING:
 * - Uses im-* prefix for all classes
 * - Supports dark/light themes via --im-* CSS variables
 * - Smooth animations for dropdown appearance
 */
export default function RootAdminMenu({ userName, userEmail }: RootAdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuListRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations();
  const menuId = "im-root-admin-menu-dropdown";

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

  return (
    <div className="im-root-admin-menu" ref={menuRef}>
      {/* Avatar button - triggers dropdown */}
      <button
        ref={buttonRef}
        className="im-root-admin-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleButtonKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={t("rootAdmin.navigation.menuLabel") + " - " + (userName || userEmail)}
      >
        <div className="im-root-admin-menu-avatar" aria-hidden="true">
          {getInitials(userName)}
        </div>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          id={menuId}
          className="im-root-admin-menu-dropdown"
          role="menu"
          aria-label={t("rootAdmin.navigation.title")}
          ref={menuListRef}
          onKeyDown={handleMenuKeyDown}
        >
          {/* User info section */}
          <div className="im-root-admin-menu-header">
            <p className="im-root-admin-menu-name">{userName || userEmail}</p>
            <p className="im-root-admin-menu-email">{userEmail}</p>
            <span className="im-root-admin-menu-badge">
              <ShieldIcon />
              {t("rootAdmin.navigation.roleLabel")}
            </span>
          </div>

          {/* Section label */}
          <p className="im-root-admin-menu-section-label">{t("rootAdmin.navigation.management")}</p>

          {/* Menu items */}
          <Link
            href="/admin/dashboard"
            className="im-root-admin-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <DashboardIcon />
            <span>{t("rootAdmin.navigation.dashboard")}</span>
          </Link>

          <Link
            href="/admin/clubs"
            className="im-root-admin-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <ClubsIcon />
            <span>{t("rootAdmin.navigation.clubsManagement")}</span>
          </Link>

          <Link
            href="/admin/super-admins"
            className="im-root-admin-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <SuperAdminsIcon />
            <span>{t("rootAdmin.navigation.superAdminsManagement")}</span>
          </Link>

          <Link
            href="/admin/users"
            className="im-root-admin-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <UsersIcon />
            <span>{t("rootAdmin.navigation.usersManagement")}</span>
          </Link>

          <Link
            href="/admin/settings"
            className="im-root-admin-menu-item"
            role="menuitem"
            tabIndex={0}
            onClick={() => setIsOpen(false)}
          >
            <SettingsIcon />
            <span>{t("rootAdmin.navigation.platformSettings")}</span>
          </Link>

          {/* Logout button */}
          <button
            className="im-root-admin-menu-item im-root-admin-menu-item--logout"
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
