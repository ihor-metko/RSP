"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import "./PlayerBackNavigation.css";

export interface PlayerBackNavigationProps {
  /**
   * Text to display in the back navigation
   * Defaults to "← Back to clubs"
   */
  text?: string;
  /**
   * Fallback URL to navigate to if no browser history is available
   * Defaults to "/" (home page)
   */
  fallbackUrl?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * PlayerBackNavigation Component
 * 
 * A lightweight back navigation element for player-facing pages.
 * - Shows only for player users (NOT in admin UI)
 * - Attempts to use browser history (router.back())
 * - Falls back to a specified URL if no history
 * - Styled neutrally (gray/muted, no purple accent)
 */
export function PlayerBackNavigation({
  text,
  fallbackUrl = "/",
  className = "",
}: PlayerBackNavigationProps) {
  const router = useRouter();
  const t = useTranslations();
  
  // Use provided text or fallback to translation
  const displayText = text || t("common.backToClubs");
  
  const handleClick = () => {
    // Check if there's browser history
    if (window.history.length > 1) {
      router.back();
    } else {
      // No history, use fallback
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`player-back-nav ${className}`.trim()}
      aria-label={displayText}
      type="button"
    >
      {displayText}
    </button>
  );
}
