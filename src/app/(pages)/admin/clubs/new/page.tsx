"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClubCreationStepper } from "@/components/admin/ClubCreationStepper.client";
import type { AdminStatusResponse } from "@/app/api/me/admin-status/route";

export default function NewClubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [adminStatus, setAdminStatus] = useState<AdminStatusResponse | null>(null);
  const [loadingAdminStatus, setLoadingAdminStatus] = useState(true);

  const fetchAdminStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/me/admin-status");
      if (response.ok) {
        const data: AdminStatusResponse = await response.json();
        setAdminStatus(data);
        return data;
      } else {
        setAdminStatus(null);
        return null;
      }
    } catch {
      setAdminStatus(null);
      return null;
    } finally {
      setLoadingAdminStatus(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    // Fetch admin status to check if user can create clubs
    fetchAdminStatus().then((adminData) => {
      // Only root admin and organization admin can create clubs
      const canCreate =
        adminData?.adminType === "root_admin" ||
        adminData?.adminType === "organization_admin";

      if (!canCreate) {
        // User is not authorized to create clubs, redirect
        router.push("/admin/clubs");
      }
    });
  }, [session, status, router, fetchAdminStatus]);

  if (status === "loading" || loadingAdminStatus) {
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

  if (!session?.user || !canCreate) {
    return null;
  }

  return (
    <main className="rsp-container">
      <ClubCreationStepper />
    </main>
  );
}
