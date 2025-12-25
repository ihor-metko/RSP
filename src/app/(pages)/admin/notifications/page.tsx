"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { IMLink } from "@/components/ui";
import { AdminNotificationsPanel } from "@/components/admin/AdminNotifications";
import { useUserStore } from "@/stores/useUserStore";


export default function AdminNotificationsPage() {
  const t = useTranslations();
  const router = useRouter();

  // Use store for auth state
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const user = useUserStore((state) => state.user);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    if (!user || !user.isRoot) {
      router.push("/auth/sign-in");
    }
  }, [user, isLoading, router, isHydrated]);

  const isLoadingState = !isHydrated || isLoading;
  const shouldShowContent = user && user.isRoot;

  return (
    <main className="rsp-container p-6">
      <header className="rsp-header flex items-center justify-between mb-8">
        <div>
          <h1 className="rsp-title text-3xl font-bold">{t("admin.notifications.title")}</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            {t("admin.notifications.subtitle")}
          </p>
        </div>
      </header>

      {isLoadingState ? (
        <section className="rsp-content">
          <div className="rsp-loading text-center">{t("admin.notifications.loading")}</div>
        </section>
      ) : !shouldShowContent ? null : (
        <section className="rsp-content">
          <div className="flex justify-between items-center mb-6">
            <IMLink href="/">
              {t("common.backToHome")}
            </IMLink>
          </div>

          <AdminNotificationsPanel />
        </section>
      )}
    </main>
  );
}
