"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import { useUserStore } from "@/stores/useUserStore";
import { signOut } from "next-auth/react";
import { useAuthStore } from "@/stores/useAuthStore";
import "./PlayerMobileHeader.css";

/**
 * Icon components for mobile header
 * Uses consistent sizing with semantic im-* classes
 */

function MenuIcon() {
  return (
    <svg
      className="im-player-mobile-header-icon"
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
      className="im-player-mobile-header-icon"
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

function UserIcon() {
  return (
    <svg
      className="im-player-mobile-header-icon"
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

function ClubsIcon() {
  return (
    <svg
      className="im-player-mobile-header-icon"
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

function CalendarIcon() {
  return (
    <svg
      className="im-player-mobile-header-icon"
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

function LogOutIcon() {
  return (
    <svg
      className="im-player-mobile-header-icon"
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
 * PlayerMobileHeader Component
 *
 * Mobile-first header for player-facing UI
 * - Left: Hamburger menu
 * - Center: Logo (clickable to home)
 * - Right: Login button (not logged in) or Profile icon (logged in)
 *
 * Mobile drawer includes:
 * - Clubs
 * - My bookings (if logged in)
 * - Profile (if logged in)
 * - Logout (if logged in)
 *
 * ACCESSIBILITY:
 * - Keyboard navigation support
 * - ARIA labels and roles
 * - Focus management
 *
 * STYLING:
 * - Uses im-* semantic classes
 * - Dark theme support via CSS variables
 * - Mobile-first design
 */
export default function PlayerMobileHeader() {
  const t = useTranslations();
  
  // User state from store
  const isLoading = useUserStore(state => state.isLoading);
  const isLoggedIn = useUserStore(state => state.isLoggedIn);
  const user = useUserStore(state => state.user);
  const clearUser = useUserStore(state => state.clearUser);
  const clearSocketToken = useAuthStore(state => state.clearSocketToken);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  const userName = user?.name;
  const userEmail = user?.email;

  // Close drawer when clicking outside
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
      if (hamburgerRef.current && !hamburgerRef.current.contains(event.target as Node)) {
        setIsDrawerOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isDrawerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, handleClickOutside]);

  // Handle keyboard navigation for hamburger
  const handleHamburgerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setIsDrawerOpen(false);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsDrawerOpen((prev) => !prev);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setIsDrawerOpen(false);
    try {
      clearUser();
      clearSocketToken();
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Logout error:", error);
      // Still attempt to navigate away even if signOut fails
      window.location.href = "/";
    }
  };

  return (
    <>
      <header className="im-player-mobile-header">
        {/* Left: Hamburger menu */}
        <button
          ref={hamburgerRef}
          className="im-player-mobile-header-hamburger"
          onClick={() => setIsDrawerOpen((prev) => !prev)}
          onKeyDown={handleHamburgerKeyDown}
          aria-expanded={isDrawerOpen}
          aria-label={isDrawerOpen ? t("common.close") : t("common.actions")}
        >
          {isDrawerOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {/* Center: Logo */}
        <IMLink href="/" className="im-player-mobile-header-logo-link" aria-label="ArenaOne">
          <span className="im-player-mobile-header-logo">
            <span className="im-player-mobile-header-logo-arena">Arena</span>
            <span className="im-player-mobile-header-logo-one">One</span>
          </span>
        </IMLink>

        {/* Right: Login or Profile */}
        <div className="im-player-mobile-header-right">
          {isLoading ? (
            <div className="im-player-mobile-header-skeleton" />
          ) : isLoggedIn ? (
            <IMLink href="/profile" className="im-player-mobile-header-avatar" aria-label={t("playerDashboard.navigation.profile")}>
              <span className="im-player-mobile-header-avatar-text">
                {getInitials(userName)}
              </span>
            </IMLink>
          ) : (
            <IMLink href="/auth/sign-in" className="im-player-mobile-header-login" aria-label={t("common.signIn")}>
              <UserIcon />
            </IMLink>
          )}
        </div>
      </header>

      {/* Mobile Drawer */}
      {isDrawerOpen && (
        <div className="im-player-mobile-drawer-overlay">
          <div className="im-player-mobile-drawer" ref={drawerRef}>
            {/* Drawer header with user info if logged in */}
            {isLoggedIn && (
              <div className="im-player-mobile-drawer-header">
                <div className="im-player-mobile-drawer-avatar">
                  {getInitials(userName)}
                </div>
                <div className="im-player-mobile-drawer-user-info">
                  <p className="im-player-mobile-drawer-user-name">{userName || userEmail}</p>
                  {userName && <p className="im-player-mobile-drawer-user-email">{userEmail}</p>}
                </div>
              </div>
            )}

            {/* Drawer navigation */}
            <nav className="im-player-mobile-drawer-nav" aria-label={t("playerDashboard.navigation.title")}>
              <IMLink
                href="/clubs"
                className="im-player-mobile-drawer-link"
                onClick={() => setIsDrawerOpen(false)}
              >
                <ClubsIcon />
                <span>{t("clubs.title")}</span>
              </IMLink>

              {isLoggedIn && (
                <>
                  <IMLink
                    href="/bookings"
                    className="im-player-mobile-drawer-link"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <CalendarIcon />
                    <span>{t("playerDashboard.navigation.bookings")}</span>
                  </IMLink>

                  <IMLink
                    href="/profile"
                    className="im-player-mobile-drawer-link"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    <UserIcon />
                    <span>{t("playerDashboard.navigation.profile")}</span>
                  </IMLink>
                </>
              )}
            </nav>

            {/* Drawer footer */}
            <div className="im-player-mobile-drawer-footer">
              {isLoggedIn ? (
                <button
                  className="im-player-mobile-drawer-logout"
                  onClick={handleLogout}
                >
                  <LogOutIcon />
                  <span>{t("common.signOut")}</span>
                </button>
              ) : (
                <div className="im-player-mobile-drawer-auth">
                  <IMLink
                    href="/auth/sign-in"
                    className="im-player-mobile-drawer-auth-link"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    {t("common.signIn")}
                  </IMLink>
                  <IMLink
                    href="/auth/sign-up"
                    className="im-player-mobile-drawer-auth-link im-player-mobile-drawer-auth-link--primary"
                    onClick={() => setIsDrawerOpen(false)}
                  >
                    {t("common.register")}
                  </IMLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
