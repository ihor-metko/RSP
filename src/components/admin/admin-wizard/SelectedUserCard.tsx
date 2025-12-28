"use client";

import { Button } from "@/components/ui";
import { useTranslations } from "next-intl";
import "./SelectedUserCard.css";

interface SelectedUserCardProps {
  name: string | undefined;
  email: string | undefined;
  onChangeUser: () => void;
  disabled?: boolean;
}

/**
 * Get user initials from name for avatar display
 */
function getInitials(name: string | null | undefined): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * SelectedUserCard Component
 * 
 * Displays the selected user in the Create Admin wizard with:
 * - Circular avatar with user initials
 * - User's full name
 * - User's email
 * - "Change User" button to re-open search
 * 
 * Follows dark theme with im-* semantic classes
 */
export function SelectedUserCard({ name, email, onChangeUser, disabled = false }: SelectedUserCardProps) {
  const t = useTranslations("createAdminWizard.existingUserSearchStep");

  return (
    <div className="im-selected-user-card">
      <div className="im-selected-user-card-content">
        {/* Avatar with initials */}
        <div className="im-selected-user-card-avatar" aria-hidden="true">
          {getInitials(name)}
        </div>
        
        {/* User info */}
        <div className="im-selected-user-card-info">
          <div className="im-selected-user-card-name">
            {name || t("noName")}
          </div>
          <div className="im-selected-user-card-email">
            {email}
          </div>
        </div>
        
        {/* Change user button */}
        <Button
          type="button"
          variant="outline"
          onClick={onChangeUser}
          disabled={disabled}
          className="im-selected-user-card-button"
          aria-label={t("changeUser")}
        >
          {t("changeUser")}
        </Button>
      </div>
    </div>
  );
}
