"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClubCreationStepper } from "@/components/admin/ClubCreationStepper.client";
import { useUserStore } from "@/stores/useUserStore";

export default function NewClubPage() {
  const router = useRouter();
  
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

    // Only root admin and organization admin can create clubs
    const canCreate =
      adminStatus?.adminType === "root_admin" ||
      adminStatus?.adminType === "organization_admin";

    if (!canCreate) {
      // User is not authorized to create clubs, redirect
      router.push("/admin/clubs");
    }
  }, [isLoggedIn, isLoadingStore, adminStatus, router]);

  if (isLoadingStore) {
    return (
      <main className="rsp-container p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  // Only root admin and organization admin can create clubs
  const canCreate =
    adminStatus?.adminType === "root_admin" ||
    adminStatus?.adminType === "organization_admin";

  if (!isLoggedIn || !canCreate) {
    return null;
  }

  return (
    <main className="rsp-container">
      <ClubCreationStepper />
    </main>
  );
}
