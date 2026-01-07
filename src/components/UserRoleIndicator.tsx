"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";
import { useUserStore } from "@/stores/useUserStore";
import { useAuthStore } from "@/stores/useAuthStore";

export function UserRoleIndicator() {
  const clearUser = useUserStore(state => state.clearUser);
  const clearSocketToken = useAuthStore(state => state.clearSocketToken);
  const hasRole = useUserStore(state => state.hasRole);
  const adminStatus = useUserStore(state => state.adminStatus);
  const isHydrated = useUserStore(state => state.isHydrated);
  const isLoading = useUserStore(state => state.isLoading);
  const user = useUserStore(state => state.user);
  const t = useTranslations();

  if (!isHydrated || isLoading) {
    return (
      <div className="rsp-user-indicator flex items-center gap-2">
        <span className="text-gray-400 text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rsp-user-indicator flex items-center gap-4">
        <IMLink
          href="/auth/sign-in"
          className="text-sm"
        >
          {t("common.signIn")}
        </IMLink>
        <IMLink
          href="/auth/sign-up"
          className="text-sm"
        >
          {t("common.register")}
        </IMLink>
      </div>
    );
  }

  const isRootAdmin = hasRole("ROOT_ADMIN");
  const isOrgAdmin = hasRole("ORGANIZATION_ADMIN");
  // Club owners and admins are identified via adminStatus, not global roles
  const isClubOwner = adminStatus?.adminType === "club_owner";
  const isClubAdmin = adminStatus?.adminType === "club_admin";

  let roleLabel = t("admin.coaches.roles.player");
  let roleBgColor = "bg-green-500";

  if (isRootAdmin) {
    roleLabel = t("admin.coaches.roles.rootAdmin");
    roleBgColor = "bg-purple-600";
  } else if (isOrgAdmin) {
    roleLabel = t("admin.coaches.roles.organizationAdmin");
    roleBgColor = "bg-blue-600";
  } else if (isClubOwner) {
    roleLabel = t("admin.coaches.roles.clubOwner");
    roleBgColor = "bg-indigo-600";
  } else if (isClubAdmin) {
    roleLabel = t("admin.coaches.roles.clubAdmin");
    roleBgColor = "bg-cyan-600";
  }

  const handleSignOut = () => {
    clearUser();
    clearSocketToken();
    signOut({ callbackUrl: "/auth/sign-in" });
  };

  return (
    <div className="rsp-user-indicator flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 dark:text-gray-300 text-sm">
          {user.name || user.email}
        </span>
        <span
          className={`${roleBgColor} text-white text-xs px-2 py-1 rounded-full font-medium`}
        >
          {roleLabel}
        </span>
      </div>
      <button
        onClick={handleSignOut}
        className="rsp-link text-red-500 hover:underline text-sm"
      >
        {t("common.signOut")}
      </button>
    </div>
  );
}
