"use client";

import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";

export function UserRoleIndicator() {
  const { data: session, status } = useSession();
  const t = useTranslations();

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

  const isRoot = session.user.isRoot;
  const roleLabel = isRoot ? t("admin.coaches.roles.rootAdmin") : t("admin.coaches.roles.player");
  const roleBgColor = isRoot ? "bg-purple-600" : "bg-green-500";

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
