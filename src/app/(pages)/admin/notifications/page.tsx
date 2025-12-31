"use client";

import { useTranslations } from "next-intl";
import { IMLink } from "@/components/ui";
import { AdminNotificationsPanel } from "@/components/admin/AdminNotifications";


export default function AdminNotificationsPage() {
  const t = useTranslations();

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

      <section className="rsp-content">
        <div className="flex justify-between items-center mb-6">
          <IMLink href="/">
            {t("common.backToHome")}
          </IMLink>
        </div>

        <AdminNotificationsPanel />
      </section>
    </main>
  );
}
