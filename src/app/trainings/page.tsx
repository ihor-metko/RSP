"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { TrainingHistory } from "@/components/training/TrainingHistory";

export default function TrainingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("training.history");

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    // Only players can access this page
    if (session.user.role !== "player") {
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

  if (!session?.user || session.user.role !== "player") {
    return null;
  }

  return (
    <main className="rsp-container min-h-screen p-8">
      {/* Header */}
      <header className="rsp-header flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="rsp-title text-3xl font-bold">{t("title")}</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-4">
          <UserRoleIndicator />
        </div>
      </header>

      {/* Navigation */}
      <div className="mb-6">
        <Link href="/clubs" className="rsp-link text-blue-500 hover:underline">
          ← Back to Clubs
        </Link>
      </div>

      {/* Training History Component */}
      <TrainingHistory />
    </main>
  );
}
