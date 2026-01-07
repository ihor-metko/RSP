"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui/IMLink";
import "./PlayerBottomNav.css";

/**
 * Icon components for bottom navigation
 * Uses consistent sizing with semantic im-* classes
 */

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function ClubsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function BookingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/**
 * PlayerBottomNav Component
 *
 * Mobile-only sticky bottom navigation for player-facing screens
 * - 4 navigation items: Home, Clubs, Bookings, Profile
 * - Sticky at bottom with full width
 * - Active state based on current route
 * - Touch-friendly targets (minimum 48px height)
 * - Dark theme with cyan/emerald active highlights
 *
 * VISIBILITY:
 * - Only visible on mobile (< 768px)
 * - Hidden on desktop views
 * - Hidden on admin/root screens (handled by layout)
 *
 * STYLING:
 * - Uses im-* semantic classes
 * - Tailwind only for layout/spacing/positioning
 * - Dark theme support via CSS variables
 *
 * ACCESSIBILITY:
 * - ARIA labels for navigation
 * - Clear active state indication
 * - Semantic HTML with nav element
 */
export function PlayerBottomNav() {
  const t = useTranslations();
  const pathname = usePathname();

  // Determine active state based on current pathname
  const isHomeActive = pathname === "/";
  const isClubsActive = pathname.startsWith("/clubs") || pathname.startsWith("/courts");
  const isBookingsActive = pathname.startsWith("/profile") || pathname.startsWith("/bookings") || pathname.startsWith("/dashboard");
  const isProfileActive = pathname.startsWith("/profile") && !isBookingsActive;

  // For bookings, we use profile page which shows bookings
  // The active state logic prioritizes bookings over profile since profile page shows bookings

  return (
    <nav className="im-player-bottom-nav" aria-label={t("playerDashboard.navigation.title")}>
      <IMLink
        href="/"
        className={`im-player-bottom-nav-item ${isHomeActive ? "im-player-bottom-nav-item--active" : ""}`}
        aria-label={t("playerDashboard.navigation.home")}
        aria-current={isHomeActive ? "page" : undefined}
      >
        <HomeIcon className="im-player-bottom-nav-icon" />
        <span className="im-player-bottom-nav-label">{t("playerDashboard.navigation.home")}</span>
      </IMLink>

      <IMLink
        href="/clubs"
        className={`im-player-bottom-nav-item ${isClubsActive ? "im-player-bottom-nav-item--active" : ""}`}
        aria-label={t("clubs.title")}
        aria-current={isClubsActive ? "page" : undefined}
      >
        <ClubsIcon className="im-player-bottom-nav-icon" />
        <span className="im-player-bottom-nav-label">{t("clubs.title")}</span>
      </IMLink>

      <IMLink
        href="/profile"
        className={`im-player-bottom-nav-item ${isBookingsActive ? "im-player-bottom-nav-item--active" : ""}`}
        aria-label={t("playerDashboard.navigation.bookings")}
        aria-current={isBookingsActive ? "page" : undefined}
      >
        <BookingsIcon className="im-player-bottom-nav-icon" />
        <span className="im-player-bottom-nav-label">{t("playerDashboard.navigation.bookings")}</span>
      </IMLink>

      <IMLink
        href="/profile"
        className={`im-player-bottom-nav-item ${isProfileActive ? "im-player-bottom-nav-item--active" : ""}`}
        aria-label={t("playerDashboard.navigation.profile")}
        aria-current={isProfileActive ? "page" : undefined}
      >
        <ProfileIcon className="im-player-bottom-nav-icon" />
        <span className="im-player-bottom-nav-label">{t("playerDashboard.navigation.profile")}</span>
      </IMLink>
    </nav>
  );
}
