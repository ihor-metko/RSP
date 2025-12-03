"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";
import { Roles, type UserRole, isValidRole } from "@/constants/roles";

const roleColors: Record<UserRole, string> = {
  [Roles.RootAdmin]: "bg-purple-600",
  [Roles.SuperAdmin]: "bg-red-500",
  [Roles.Admin]: "bg-red-500",
  [Roles.Coach]: "bg-blue-500",
  [Roles.Player]: "bg-green-500",
};

export function UserRoleIndicator() {
  const { data: session, status } = useSession();
  const t = useTranslations();

  const roleLabels: Record<UserRole, string> = {
    [Roles.RootAdmin]: t("admin.coaches.roles.rootAdmin"),
    [Roles.SuperAdmin]: t("admin.coaches.roles.super_admin"),
    [Roles.Admin]: t("admin.coaches.roles.admin"),
    [Roles.Coach]: t("admin.coaches.roles.coach"),
    [Roles.Player]: t("admin.coaches.roles.player"),
  };

  if (status === "loading") {
    return (
      <div className="rsp-user-indicator flex items-center gap-2">
        <span className="text-gray-400 text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  if (!session?.user) {
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

  const role = session.user.role;

  // Handle case where role is undefined or invalid
  if (!isValidRole(role)) {
    return (
      <div className="rsp-user-indicator flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 dark:text-gray-300 text-sm">
            {session.user.name || session.user.email}
          </span>
          <span className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            {t("common.noRole")}
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
          className="rsp-link text-red-500 hover:underline text-sm"
        >
          {t("common.signOut")}
        </button>
      </div>
    );
  }

  const roleBgColor = roleColors[role];
  const roleLabel = roleLabels[role];

  return (
    <div className="rsp-user-indicator flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 dark:text-gray-300 text-sm">
          {session.user.name || session.user.email}
        </span>
        <span
          className={`${roleBgColor} text-white text-xs px-2 py-1 rounded-full font-medium`}
        >
          {roleLabel}
        </span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
        className="rsp-link text-red-500 hover:underline text-sm"
      >
        {t("common.signOut")}
      </button>
    </div>
  );
}
