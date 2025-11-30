"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { UserRoleIndicator } from "@/components/UserRoleIndicator";
import { CoachTimeOff } from "@/components/coach";

interface CoachProfile {
  id: string;
  userId: string;
  bio: string | null;
  phone: string | null;
}

export default function CoachTimeOffPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [coachProfile, setCoachProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/auth/sign-in");
      return;
    }

    if (session.user.role !== "coach" && session.user.role !== "admin") {
      setError("Access denied. Only coaches can access this page.");
      setLoading(false);
      return;
    }

    // Fetch coach profile to get the coach ID
    const fetchCoachProfile = async () => {
      try {
        const response = await fetch("/api/coach/profile");
        
        if (response.status === 401) {
          router.push("/auth/sign-in");
          return;
        }
        
        if (response.status === 403) {
          setError("Access denied. Only coaches can access this page.");
          return;
        }
        
        if (response.status === 404) {
          setError("Coach profile not found. Please complete your coach profile setup.");
          return;
        }
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch coach profile");
        }
        
        const data = await response.json();
        setCoachProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchCoachProfile();
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <main className="rsp-container min-h-screen p-8">
        <div className="rsp-loading text-center">Loading...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="rsp-container min-h-screen p-8">
        <Card>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Link href="/coach/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="rsp-container min-h-screen p-8">
      {/* Header */}
      <header className="rsp-header flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="rsp-title text-3xl font-bold">Time Off Management</h1>
          <p className="rsp-subtitle text-gray-500 mt-2">
            Mark specific days or hours as unavailable
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
      </div>

      {/* Coach Time Off Component */}
      {coachProfile && (
        <CoachTimeOff coachId={coachProfile.id} />
      )}
    </main>
  );
}
