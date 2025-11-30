"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { TrainerRequests } from "@/components/training/TrainerRequests";

export default function TrainerRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    if (session.user.role !== "coach" && session.user.role !== "admin") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <main className="rsp-container min-h-screen p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  if (!session?.user || (session.user.role !== "coach" && session.user.role !== "admin")) {
    return null;
  }

  return (
    <main className="rsp-container min-h-screen p-8">
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
        <Link href="/coach/dashboard" className="rsp-link text-blue-500 hover:underline">
          ← Back to Dashboard
        </Link>
        <Link href="/coach/availability">
          <Button variant="outline">Manage Weekly Availability</Button>
        </Link>
      </div>

      {/* Training Requests Component */}
      <TrainerRequests />
    </main>
  );
}
