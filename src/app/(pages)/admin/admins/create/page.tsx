"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { CreateAdminWizard } from "@/components/admin/admin-wizard";
import { useUserStore } from "@/stores/useUserStore";
import { PageHeaderSkeleton } from "@/components/ui/skeletons";
import type { CreateAdminWizardConfig } from "@/types/adminWizard";

/**
 * Create Admin Page (Root Admin Context)
 * 
 * This page allows root admins to create organization and club admins.
 * Organization selection is available in the wizard.
 */
export default function CreateAdminPage() {
  const router = useRouter();
  
  // Use store for auth state
  const isHydrated = useUserStore((state) => state.isHydrated);
  const isLoading = useUserStore((state) => state.isLoading);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const hasAnyRole = useUserStore((state) => state.hasAnyRole);

  useEffect(() => {
    if (!isHydrated || isLoading) return;

    // Only ROOT_ADMIN and ORGANIZATION_ADMIN can access this page
    if (!isLoggedIn || !hasAnyRole(["ROOT_ADMIN", "ORGANIZATION_ADMIN"])) {
      router.push("/auth/sign-in");
      return;
    }
  }, [isLoggedIn, isLoading, router, isHydrated, hasAnyRole]);

  const isLoadingState = !isHydrated || isLoading;

  // Determine wizard configuration based on user role
  const getWizardConfig = (): CreateAdminWizardConfig => {
    const adminStatus = useUserStore.getState().adminStatus;

    if (adminStatus?.adminType === "root_admin") {
      // Root admin can create both org and club admins
      return {
        context: "root",
        allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
        onSuccess: (userId) => {
          router.push(`/admin/users/${userId}`);
        },
        onCancel: () => {
          router.push("/admin/users");
        },
      };
    } else if (adminStatus?.adminType === "organization_admin" && adminStatus.managedIds.length > 0) {
      // Organization admin can create admins for their organization
      return {
        context: "organization",
        defaultOrgId: adminStatus.managedIds[0],
        allowedRoles: ["ORGANIZATION_ADMIN", "CLUB_ADMIN"],
        onSuccess: (userId) => {
          router.push(`/admin/users/${userId}`);
        },
        onCancel: () => {
          router.push("/admin/users");
        },
      };
    }

    // Fallback (shouldn't reach here due to auth check)
    return {
      context: "root",
      allowedRoles: ["ORGANIZATION_ADMIN"],
      onCancel: () => {
        router.push("/admin/users");
      },
    };
  };

  if (isLoadingState) {
    return (
      <main className="im-admin-page">
        <PageHeaderSkeleton showDescription />
      </main>
    );
  }

  const wizardConfig = getWizardConfig();

  return (
    <main className="im-admin-page">
      <PageHeader
        title="Create Admin"
        description="Add a new administrator to the platform"
      />

      <section className="rsp-content">
        <CreateAdminWizard config={wizardConfig} />
      </section>
    </main>
  );
}
