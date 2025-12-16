"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { OrganizationCreationStepper } from "@/components/admin/OrganizationCreationStepper.client";
import { useUserStore } from "@/stores/useUserStore";

export default function NewOrganizationPage() {
  const router = useRouter();
  const t = useTranslations("common");
  
  // Get admin status from user store
  const adminStatus = useUserStore((state) => state.adminStatus);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const isLoadingStore = useUserStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoadingStore) return;

    if (!isLoggedIn) {
      router.push("/auth/sign-in");
      return;
    }

    // Only root admin can create organizations
    const canCreate = adminStatus?.adminType === "root_admin";

    if (!canCreate) {
      // User is not authorized to create organizations, redirect
      router.push("/admin/organizations");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router]);

  if (isLoadingStore) {
    return (
      <main className="rsp-container p-8">
        <div className="rsp-loading text-center">{t("loading")}</div>
      </main>
    );
  }

  // Only root admin can create organizations
  const canCreate = adminStatus?.adminType === "root_admin";

  if (!isLoggedIn || !canCreate) {
    return null;
  }

  return (
    <main className="rsp-container">
      <OrganizationCreationStepper />
    </main>
  );
}
