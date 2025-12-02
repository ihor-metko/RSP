"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { DarkModeToggle, LanguageSwitcher, IMLink } from "@/components/ui";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";
import type { UserRole } from "@/lib/auth";
import "./Header.css";

export interface HeaderProps {
  /** Optional page title to display */
  title?: string;
  /** Optionally show a compact search input */
  showSearch?: boolean;
  /** Hide profile controls (useful for public landing) */
  hideProfile?: boolean;
}

interface NavLink {
  href: string;
  label: string;
  icon?: string;
}

/**
 * Strip trailing arrow from label
 * Translation labels may include arrows like "View Clubs →"
 * but the header nav should display clean text
 */
function stripArrow(label: string): string {
  return label.replace(" →", "");
}

/**
 * Get navigation links based on user role
 */
function getRoleNavLinks(role: UserRole | undefined, t: ReturnType<typeof useTranslations>): NavLink[] {
  const links: NavLink[] = [];

  if (role === "admin") {
    links.push(
      { href: "/admin/clubs", label: t("home.manageClubs"), icon: "🏟️" },
      { href: "/admin/coaches", label: t("home.manageCoaches"), icon: "👨‍🏫" },
      { href: "/admin/notifications", label: t("home.manageNotifications"), icon: "🔔" }
    );
  } else if (role === "coach") {
    links.push(
      { href: "/coach/dashboard", label: t("coach.dashboard.title"), icon: "📋" },
      { href: "/coach/requests", label: t("coach.requests.title"), icon: "📩" },
      { href: "/coach/availability", label: t("coach.availability.title"), icon: "📅" }
    );
  } else if (role === "player") {
    links.push(
      { href: "/dashboard", label: t("home.dashboard"), icon: "🏠" },
      { href: "/trainings", label: t("training.history.title"), icon: "📋" },
      { href: "/clubs", label: t("clubs.title"), icon: "🏟️" }
    );
  }

  return links;
}

/**
 * Get dropdown menu items based on user role
 */
function getRoleDropdownItems(
  role: UserRole | undefined,
  t: ReturnType<typeof useTranslations>
): NavLink[] {
  const items: NavLink[] = [];

  // Common items for all roles
  items.push({ href: "/", label: t("playerDashboard.navigation.home"), icon: "🏠" });

  // Role-specific items
  if (role === "admin") {
    items.push({ href: "/admin/clubs", label: t("admin.clubs.title"), icon: "⚙️" });
  } else if (role === "coach") {
    items.push({ href: "/coach/dashboard", label: t("coach.dashboard.title"), icon: "📋" });
  } else if (role === "player") {
    items.push(
      { href: "/dashboard", label: t("home.dashboard"), icon: "📊" },
      { href: "/trainings", label: t("training.history.title"), icon: "📋" }
    );
  }

  return items;
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
 * Get role badge class
 */
function getRoleBadgeClass(role: UserRole | undefined): string {
  switch (role) {
    case "admin":
      return "rsp-header-role-badge--admin";
    case "coach":
      return "rsp-header-role-badge--coach";
    case "player":
      return "rsp-header-role-badge--player";
    default:
      return "";
  }
}

/**
 * Get translated role label
 */
function getRoleLabel(role: UserRole | undefined, t: ReturnType<typeof useTranslations>): string {
  switch (role) {
    case "admin":
      return t("admin.coaches.roles.admin");
    case "coach":
      return t("admin.coaches.roles.coach");
    case "player":
      return t("admin.coaches.roles.player");
    default:
      return t("common.noRole");
  }
}

/**
 * Global role-aware Header component
 * Renders role-specific navigation and controls
 */
export default function Header({ title, showSearch = false, hideProfile = false }: HeaderProps) {
  const { data: session, status } = useSession();
  const t = useTranslations();
  const currentLocale = useCurrentLocale();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated" && session?.user;
  const userRole = session?.user?.role;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;

  // Get navigation links and dropdown items based on role
  const navLinks = getRoleNavLinks(userRole, t);
  const dropdownItems = getRoleDropdownItems(userRole, t);

  // Close dropdowns when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
      setIsProfileOpen(false);
    }
    if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
      // Only close if the click is not on the toggle button
      const toggleButton = document.querySelector(".rsp-header-mobile-toggle");
      if (toggleButton && !toggleButton.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClickOutside]);

  // Handle keyboard navigation
  const handleProfileKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsProfileOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsProfileOpen((prev) => !prev);
    }
  };

  const handleMobileMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsMobileMenuOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsMobileMenuOpen((prev) => !prev);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setIsProfileOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="rsp-header-container">
      <header className="rsp-header">
        {/* Left section: Brand and navigation */}
        <div className="rsp-header-left">
          <div className="rsp-header-brand">
            <Link href="/" aria-label={t("home.title")}>
              <span className="rsp-header-title">{title || t("home.title")}</span>
            </Link>
          </div>

          {/* Desktop navigation */}
          {isAuthenticated && navLinks.length > 0 && (
            <nav className="rsp-header-nav" aria-label={t("playerDashboard.navigation.title")}>
              {navLinks.slice(0, 3).map((link) => (
                <IMLink
                  key={link.href}
                  href={link.href}
                  className="rsp-header-nav-link"
                >
                  {link.icon && <span aria-hidden="true">{link.icon}</span>} {stripArrow(link.label)}
                </IMLink>
              ))}
            </nav>
          )}
        </div>

        {/* Right section: Search, controls, profile */}
        <div className="rsp-header-right">
          {/* Search input (optional) */}
          {showSearch && (
            <div className="rsp-header-search">
              <input
                type="search"
                placeholder={t("common.search")}
                className="rsp-header-search-input"
                aria-label={t("common.search")}
              />
            </div>
          )}

          {/* Desktop controls */}
          <div className="rsp-header-controls">
            <LanguageSwitcher currentLocale={currentLocale} />
            <DarkModeToggle />
          </div>

          {/* Profile or Auth links */}
          {!hideProfile && (
            <>
              {isLoading ? (
                <div className="rsp-header-skeleton">
                  <div className="rsp-header-skeleton-avatar" />
                  <div className="rsp-header-skeleton-text" />
                </div>
              ) : isAuthenticated ? (
                <div className="rsp-header-profile" ref={profileRef}>
                  <button
                    className="rsp-header-profile-button"
                    onClick={() => setIsProfileOpen((prev) => !prev)}
                    onKeyDown={handleProfileKeyDown}
                    aria-expanded={isProfileOpen}
                    aria-haspopup="true"
                    aria-label={t("playerDashboard.navigation.profile")}
                  >
                    <div className="rsp-header-avatar" aria-hidden="true">
                      {getInitials(userName)}
                    </div>
                    <div className="rsp-header-user-info">
                      <span className="rsp-header-user-name">
                        {userName || userEmail || t("common.noRole")}
                      </span>
                      <span className={`rsp-header-role-badge ${getRoleBadgeClass(userRole)}`}>
                        {getRoleLabel(userRole, t)}
                      </span>
                    </div>
                    <svg
                      className={`rsp-header-chevron ${isProfileOpen ? "rsp-header-chevron--open" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Profile dropdown */}
                  {isProfileOpen && (
                    <div
                      className="rsp-header-dropdown"
                      role="menu"
                      aria-label={t("playerDashboard.navigation.profile")}
                    >
                      {/* User info section */}
                      <div className="rsp-header-dropdown-section">
                        <div className="px-4 py-2">
                          <p className="rsp-header-dropdown-user-name">
                            {userName || userEmail}
                          </p>
                          <p className="rsp-header-dropdown-user-email">
                            {userEmail}
                          </p>
                        </div>
                      </div>

                      {/* Navigation items */}
                      <div className="rsp-header-dropdown-section">
                        {dropdownItems.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            className="rsp-header-dropdown-item"
                            role="menuitem"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            {item.icon && <span aria-hidden="true">{item.icon}</span>}
                            {stripArrow(item.label)}
                          </Link>
                        ))}
                      </div>

                      {/* Logout */}
                      <div className="rsp-header-dropdown-section">
                        <button
                          className="rsp-header-dropdown-item rsp-header-dropdown-item--danger"
                          role="menuitem"
                          onClick={handleLogout}
                        >
                          <span aria-hidden="true">🚪</span>
                          {t("common.signOut")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rsp-header-auth-links">
                  <Link href="/auth/sign-in" className="rsp-header-auth-link">
                    {t("common.signIn")}
                  </Link>
                  <Link href="/auth/sign-up" className="rsp-header-auth-link rsp-header-auth-link--primary">
                    {t("common.register")}
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Mobile menu toggle */}
          <button
            className="rsp-header-mobile-toggle"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            onKeyDown={handleMobileMenuKeyDown}
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? t("common.close") : t("common.actions")}
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="rsp-header-mobile-menu" ref={mobileMenuRef}>
          {/* Mobile navigation */}
          {isAuthenticated && navLinks.length > 0 && (
            <nav className="rsp-header-mobile-nav" aria-label={t("playerDashboard.navigation.title")}>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rsp-header-mobile-nav-link"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.icon && <span aria-hidden="true">{link.icon}</span>} {stripArrow(link.label)}
                </Link>
              ))}
            </nav>
          )}

          {/* Mobile controls */}
          <div className="rsp-header-mobile-controls">
            <LanguageSwitcher currentLocale={currentLocale} />
            <DarkModeToggle />
          </div>

          {/* Mobile auth links for unauthenticated users */}
          {!isAuthenticated && !hideProfile && (
            <div className="rsp-header-mobile-nav">
              <Link
                href="/auth/sign-in"
                className="rsp-header-mobile-nav-link"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {t("common.signIn")}
              </Link>
              <Link
                href="/auth/sign-up"
                className="rsp-header-mobile-nav-link"
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
