"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button, Card, Input, Modal, DarkModeToggle, LanguageSwitcher } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { useCurrentLocale } from "@/hooks/useCurrentLocale";

export default function Home() {
  const { data: session } = useSession();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations();
  const currentLocale = useCurrentLocale();

  return (
    <main className="rsp-container min-h-screen p-8">
      <header className="rsp-header flex items-center justify-between mb-8">
        <h1 className="rsp-title text-3xl font-bold">{t("home.title")}</h1>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
          <LanguageSwitcher currentLocale={currentLocale} />
          <DarkModeToggle />
        </div>
      </header>

      <section className="rsp-content max-w-2xl mx-auto">
        <Card title={t("home.welcomeTitle")}>
          <p className="rsp-text mb-4">
            {t("home.welcomeMessage")}
          </p>
          <div className="rsp-form-group mb-4">
            <Input
              label={t("home.yourName")}
              placeholder={t("home.enterYourName")}
              type="text"
            />
          </div>
          <div className="rsp-button-group flex gap-2">
            <Button onClick={() => setIsModalOpen(true)}>{t("home.openModal")}</Button>
            <Button variant="outline">{t("home.secondaryAction")}</Button>
          </div>
        </Card>

        <Card title={t("home.quickLinks")} className="mt-6">
          <div className="rsp-links flex flex-col gap-2">
            {session?.user?.role === "player" && (
              <Link href="/clubs" className="rsp-link text-blue-500 hover:underline">
                {t("home.viewClubs")}
              </Link>
            )}

            {session?.user?.role === "coach" && (
              <>
                <Link href="/coach/dashboard" className="rsp-link text-blue-500 hover:underline">
                  {t("home.dashboard")}
                </Link>
              </>
            )}
            {session?.user?.role === "admin" && (
              <>
                <Link href="/admin/clubs" className="rsp-link text-blue-500 hover:underline">
                  {t("home.manageClubs")}
                </Link>
                <Link href="/admin/coaches" className="rsp-link text-blue-500 hover:underline">
                  {t("home.manageCoaches")}
                </Link>
              </>
            )}
          </div>
        </Card>
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t("home.exampleModal")}
      >
        <p className="rsp-modal-content">
          {t("home.exampleModalContent")}
        </p>
        <div className="rsp-modal-actions mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => setIsModalOpen(false)}>{t("common.confirm")}</Button>
        </div>
      </Modal>
    </main>
  );
}
