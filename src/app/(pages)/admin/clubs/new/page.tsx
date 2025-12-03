"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ClubCreationStepper } from "@/components/admin/ClubCreationStepper.client";
import { Roles } from "@/constants/roles";

export default function NewClubPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== Roles.SuperAdmin) {
      router.push("/auth/sign-in");
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

  if (!session?.user || session.user.role !== Roles.SuperAdmin) {
    return null;
  }

  return (
    <main className="rsp-container">
      <ClubCreationStepper />
    </main>
  );
}
