"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { DarkModeToggle, LanguageSwitcher, NotificationsDropdown } from "@/components/ui";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import { useUserStore } from "@/stores/useUserStore";
import UserMenu from "./UserMenu";
import "./Header.css";

export interface HeaderProps {
  /** Optionally show a compact search input */
  showSearch?: boolean;
  /** Hide profile controls (useful for public landing) */
  hideProfile?: boolean;
}

/**
 * Outline icon components for navigation
 * Uses consistent 18-20px sizing with color: var(--im-icon-color)
 *
 * ARIA: Icons are decorative (aria-hidden="true")
 */

function ClubsIcon() {
  return (
    <svg
      className="im-header-icon"
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

function CourtsIcon() {
  return (
    <svg
      className="im-header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

function CoachesIcon() {
  return (
    <svg
      className="im-header-icon"
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

function EventsIcon() {
  return (
    <svg
      className="im-header-icon"
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

function MenuIcon() {
  return (
    <svg
      className="im-header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="im-header-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Primary navigation links
 * Displayed for all users (authenticated or not)
 */
interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
}

const primaryNavItems: NavItem[] = [
  { href: "/clubs", labelKey: "clubs.title", icon: <ClubsIcon /> },
  { href: "/courts", labelKey: "common.courts", icon: <CourtsIcon /> },
  { href: "/coaches", labelKey: "home.coaches", icon: <CoachesIcon /> },
  { href: "/events", labelKey: "common.events", icon: <EventsIcon /> },
];

/**
 * Global Header component
 *
 * Left side: Logo (clickable link to /) + primary navigation (Clubs, Courts, Coaches, Events)
 * Right side: compact user avatar with dropdown (no role visible for players)
 *
 * ACCESSIBILITY:
 * - Keyboard navigation: Tab to avatar, Enter/Space opens menu, Arrow keys navigate inside menu, Escape closes
 * - Focus ring using outline: 2px solid var(--im-primary)
 * - role="menu" and role="menuitem" semantics in UserMenu
 *
 * STYLING:
 * - All classes use im-* prefix
 * - All colors use global CSS variables (--im-*)
 * - Header height: 56px desktop, 48px mobile
 */
export default function Header({ showSearch = false, hideProfile = false }: HeaderProps) {
  const t = useTranslations();
  const currentLocale = useCurrentLocale();
  
  // Use store for auth
  const isLoading = useUserStore(state => state.isLoading);
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const user = useUserStore(state => state.user);
  const adminStatus = useUserStore(state => state.adminStatus);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isAuthenticated = isLoggedIn && user;
  const isRoot = user?.isRoot ?? false;
  const userName = user?.name;
  const userEmail = user?.email;
  const isAdmin = adminStatus?.isAdmin ?? false;

  // Close mobile menu when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
      const toggleButton = document.querySelector(".im-header-mobile-toggle");
      if (toggleButton && !toggleButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Handle keyboard navigation for mobile menu toggle
  const handleMobileMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsMobileMenuOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsMobileMenuOpen((prev) => !prev);
    }
  };

  /**
   * Get translated label for nav item
   * Falls back to the key's last segment if translation is missing
   */
  const getNavLabel = (labelKey: string): string => {
    const label = t(labelKey);
    // If translation returns the key itself, extract last segment as fallback
    if (label === labelKey) {
      return labelKey.split(".").pop() || "";
    }
    return label;
  };

  return (
    <div className="im-header-container">
      <header className="im-header">
        {/* Left section: Brand and navigation */}
        <div className="im-header-left">
          {/* Logo / Brand */}
          <Link href="/" className="im-header-brand" aria-label="ArenaOne">
            <span className="im-logo">
              <span className="im-logo-arena">Arena</span>
              <span className="im-logo-one">One</span>
            </span>
          </Link>
        </div>

        {/* Right section: Search, controls, profile/auth */}
        <div className="im-header-right">
          {/* Search input (optional) */}
          {showSearch && (
            <div className="im-header-search">
              <input
                type="search"
                placeholder={t("common.search")}
                className="im-header-search-input"
                aria-label={t("common.search")}
              />
            </div>
          )}

          {/* Desktop controls */}
          <div className="im-header-controls">
            <LanguageSwitcher currentLocale={currentLocale} />
            <DarkModeToggle />
          </div>

          {/* Notifications - Admin users only */}
          {isAuthenticated && isAdmin && (
            <NotificationsDropdown maxDropdownItems={10} />
          )}

          {/* Profile or Auth links */}
          {!hideProfile && (
            <>
              {isLoading ? (
                <div className="im-header-skeleton">
                  <div className="im-header-skeleton-avatar" />
                </div>
              ) : isAuthenticated ? (
                <UserMenu
                  userName={userName}
                  userEmail={userEmail}
                  isRoot={isRoot}
                />
              ) : (
                <div className="im-header-auth-links">
                  <Link href="/auth/sign-in" className="im-header-auth-link">
                    {t("common.signIn")}
                  </Link>
                  <Link href="/auth/sign-up" className="im-header-auth-link im-header-auth-link--primary">
                    {t("common.register")}
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile menu toggle - hamburger */}
          <button
            className="im-header-mobile-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            onKeyDown={handleMobileMenuKeyDown}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? t("common.close") : t("common.actions")}
          >
            {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </header>

      {/* Mobile menu - slide-over with nav items */}
      {isMobileMenuOpen && (
        <div className="im-header-mobile-menu" ref={mobileMenuRef}>
          {/* Mobile navigation */}
          <nav className="im-header-mobile-nav" aria-label={t("playerDashboard.navigation.title")}>
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="im-header-mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.icon}
                <span>{getNavLabel(item.labelKey)}</span>
              </Link>
            ))}
          </nav>

          {/* Mobile controls */}
          <div className="im-header-mobile-controls">
            <LanguageSwitcher currentLocale={currentLocale} />
            <DarkModeToggle />
          </div>

          {/* Mobile auth links for unauthenticated users */}
          {!isAuthenticated && !hideProfile && (
            <div className="im-header-mobile-auth">
              <Link
                href="/auth/sign-in"
                className="im-header-mobile-auth-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("common.signIn")}
              </Link>
              <Link
                href="/auth/sign-up"
                className="im-header-mobile-auth-link im-header-mobile-auth-link--primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("common.register")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
