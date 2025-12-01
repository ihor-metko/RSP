"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { AdminNotificationsPanel } from "@/components/admin/AdminNotifications";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";

export default function AdminNotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "admin") {
      router.push("/auth/sign-in");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return (
      <main className="rsp-container min-h-screen p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  if (!session?.user || session.user.role !== "admin") {
    return null;
  }

  return (
    <main className="rsp-container min-h-screen p-8">
      <header className="rsp-header flex items-center justify-between mb-8">
        <div>
          <h1 className="rsp-title text-3xl font-bold">Admin - Notifications</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            Track all training booking events
          </p>
        </div>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
        </div>
      </header>

      <section className="rsp-content">
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="rsp-link text-blue-500 hover:underline">
            ← Back to Home
          </Link>
        </div>

        <AdminNotificationsPanel pollInterval={30000} />
      </section>
    </main>
  );
}
