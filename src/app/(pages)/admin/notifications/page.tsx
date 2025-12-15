"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { IMLink } from "@/components/ui";
import { AdminNotificationsPanel } from "@/components/admin/AdminNotifications";


export default function AdminNotificationsPage() {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || !session.user.isRoot) {
      router.push("/auth/sign-in");
    }
  }, [session, status, router]);

  const isLoadingState = status === "loading";
  const shouldShowContent = session?.user && session.user.isRoot;

  return (
    <main className="rsp-container p-8">
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

          <AdminNotificationsPanel pollInterval={30000} />
        </section>
      )}
    </main>
  );
}
