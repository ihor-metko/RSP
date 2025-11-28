"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import type { UserRole } from "@/lib/auth";

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-500",
  coach: "bg-blue-500",
  player: "bg-green-500",
};

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  coach: "Coach",
  player: "Player",
};

export function UserRoleIndicator() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="rsp-user-indicator flex items-center gap-2">
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="rsp-user-indicator flex items-center gap-4">
        <Link
          href="/auth/sign-in"
          className="rsp-link text-blue-500 hover:underline text-sm"
        >
          Sign In
        </Link>
        <Link
          href="/auth/sign-up"
          className="rsp-link text-blue-500 hover:underline text-sm"
        >
          Register
        </Link>
      </div>
    );
  }

  const role = session.user.role || "player";
  const roleBgColor = roleColors[role] || "bg-gray-500";
  const roleLabel = roleLabels[role] || role;

  return (
    <div className="rsp-user-indicator flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-400 dark:text-gray-300 text-sm">
          {session.user.name || session.user.email}
        </span>
        <span
          className={`${roleBgColor} text-white text-xs px-2 py-1 rounded-full font-medium`}
        >
          {roleLabel}
        </span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
        className="rsp-link text-red-500 hover:underline text-sm"
      >
        Sign Out
      </button>
    </div>
  );
}
