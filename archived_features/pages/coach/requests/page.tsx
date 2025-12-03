"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, IMLink } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { DashboardFooter } from "@/components/layout";
import { TrainerRequests } from "../../../components/training/TrainerRequests";

export default function TrainerRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    if (session.user.role !== "coach" && session.user.role !== "super_admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <main className="rsp-container p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  if (!session?.user || (session.user.role !== "coach" && session.user.role !== "super_admin")) {
    return null;
  }

  return (
    <main className="rsp-container p-8">
      {/* Header */}
      <header className="rsp-header flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="rsp-title text-3xl font-bold">Training Requests</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            Manage your incoming training requests
          </p>
        </div>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
        </div>
      </header>

      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <IMLink href="/coach/dashboard">
          ← Back to Dashboard
        </IMLink>
        <IMLink href="/coach/availability">
          <Button variant="outline">Manage Weekly Availability</Button>
        </IMLink>
      </div>

      {/* Training Requests Component */}
      <TrainerRequests />

      {/* Dashboard Footer */}
      <DashboardFooter />
    </main>
  );
}
