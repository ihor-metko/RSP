"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useUserStore } from "@/stores/useUserStore";

interface InviteDetails {
  id: string;
  email: string;
  role: string;
  organizationId: string | null;
  clubId: string | null;
  organization: { id: string; name: string } | null;
  club: { id: string; name: string } | null;
  expiresAt: string;
  createdAt: string;
}

type LoadingState = "validating" | "accepting" | null;
type ErrorState = "invalid" | "expired" | "revoked" | "accepted" | "email_mismatch" | "server_error" | null;

export default function InviteAcceptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const user = useUserStore(state => state.user);

  const [token, setToken] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("validating");
  const [errorState, setErrorState] = useState<ErrorState>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Extract token from URL
  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setErrorState("invalid");
      setLoadingState(null);
      return;
    }
    setToken(tokenParam);
  }, [searchParams]);

  // Validate token when available
  useEffect(() => {
    if (!token) return;

    const validateToken = async () => {
      setLoadingState("validating");
      setErrorState(null);

      try {
        const response = await fetch(`/api/invites/validate?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          // Handle specific error cases
          if (response.status === 410) {
            if (data.error?.includes("accepted")) {
              setErrorState("accepted");
            } else if (data.error?.includes("revoked")) {
              setErrorState("revoked");
            } else if (data.error?.includes("expired")) {
              setErrorState("expired");
            }
          } else if (response.status === 404) {
            setErrorState("invalid");
          } else {
            setErrorState("server_error");
          }
          setLoadingState(null);
          return;
        }

        setInviteDetails(data.invite);
        setLoadingState(null);
      } catch (error) {
        console.error("Error validating invite:", error);
        setErrorState("server_error");
        setLoadingState(null);
      }
    };

    validateToken();
  }, [token]);

  // Handle authentication flow
  useEffect(() => {
    if (!inviteDetails || loadingState || showConfirmation) return;

    // Function to check user exists and redirect
    const checkUserExists = async (email: string) => {
      try {
        // We'll redirect to sign-up with email pre-filled
        // If user exists, they'll be prompted to sign in instead
        const redirectUrl = `/auth/sign-up?email=${encodeURIComponent(email)}&inviteToken=${encodeURIComponent(token!)}&redirectTo=${encodeURIComponent(`/invites/accept?token=${token}`)}`;
        router.push(redirectUrl);
      } catch (error) {
        console.error("Error checking user:", error);
        setErrorState("server_error");
      }
    };

    // If user is not authenticated, redirect to sign-in/sign-up with token
    if (sessionStatus === "unauthenticated") {
      const inviteEmail = inviteDetails.email;
      // Check if user with this email exists
      checkUserExists(inviteEmail);
    } else if (sessionStatus === "authenticated" && user && user.email) {
      // If authenticated, check if email matches
      if (user.email.toLowerCase() !== inviteDetails.email.toLowerCase()) {
        setErrorState("email_mismatch");
      } else {
        // Show confirmation screen
        setShowConfirmation(true);
      }
    }
  }, [inviteDetails, sessionStatus, user, loadingState, showConfirmation, router, token]);

  const handleAcceptInvite = async () => {
    if (!token) return;

    setLoadingState("accepting");
    setErrorState(null);

    try {
      const response = await fetch("/api/invites/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setErrorState("email_mismatch");
        } else if (response.status === 410) {
          if (data.error?.includes("accepted")) {
            setErrorState("accepted");
          } else if (data.error?.includes("revoked")) {
            setErrorState("revoked");
          } else if (data.error?.includes("expired")) {
            setErrorState("expired");
          }
        } else if (response.status === 404) {
          setErrorState("invalid");
        } else {
          setErrorState("server_error");
        }
        setLoadingState(null);
        return;
      }

      // Success! Redirect to appropriate dashboard
      const isOrgRole = inviteDetails?.organizationId;
      const isClubRole = inviteDetails?.clubId;

      if (isOrgRole) {
        router.push(`/admin/organizations/${inviteDetails.organizationId}`);
      } else if (isClubRole) {
        router.push(`/admin/clubs/${inviteDetails.clubId}`);
      } else {
        router.push("/admin/dashboard");
      }
    } catch (error) {
      console.error("Error accepting invite:", error);
      setErrorState("server_error");
      setLoadingState(null);
    }
  };

  // Render loading state
  if (loadingState === "validating" || sessionStatus === "loading") {
    return (
      <div className="im-auth-card">
        <div className="text-center" style={{ color: "var(--im-auth-text)" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  // Render error states
  if (errorState) {
    return (
      <div className="im-auth-card">
        <div className="im-auth-card-header">
          <h1 className="im-auth-card-title">{t("invites.errorTitle")}</h1>
        </div>
        <div className="im-auth-form">
          <div role="alert" className="im-auth-error">
            {errorState === "invalid" && t("invites.invalidToken")}
            {errorState === "expired" && t("invites.expiredToken")}
            {errorState === "revoked" && t("invites.revokedToken")}
            {errorState === "accepted" && t("invites.alreadyAccepted")}
            {errorState === "email_mismatch" && t("invites.emailMismatch")}
            {errorState === "server_error" && t("invites.serverError")}
          </div>
          <button
            onClick={() => router.push("/")}
            className="im-auth-button"
          >
            {t("common.backToHome")}
          </button>
        </div>
      </div>
    );
  }

  // Render confirmation screen
  if (showConfirmation && inviteDetails) {
    const isOwnerRole = inviteDetails.role === "ORGANIZATION_OWNER" || inviteDetails.role === "CLUB_OWNER";
    const entityName = inviteDetails.organization?.name || inviteDetails.club?.name || "";
    const entityType = inviteDetails.organizationId ? t("common.organization") : t("common.club");
    const roleDisplay = formatRoleForDisplay(inviteDetails.role);

    return (
      <div className="im-auth-card">
        <div className="im-auth-card-header">
          <h1 className="im-auth-card-title">{t("invites.confirmTitle")}</h1>
          <p className="im-auth-card-subtitle">{t("invites.confirmSubtitle")}</p>
        </div>
        <div className="im-auth-form">
          <div style={{ 
            background: "var(--im-card-bg)", 
            border: "1px solid var(--im-border-color)",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px"
          }}>
            <div style={{ marginBottom: "12px" }}>
              <strong style={{ color: "var(--im-text-primary)" }}>{entityType}:</strong>
              <div style={{ color: "var(--im-text-secondary)", marginTop: "4px" }}>{entityName}</div>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <strong style={{ color: "var(--im-text-primary)" }}>{t("invites.role")}:</strong>
              <div style={{ color: "var(--im-text-secondary)", marginTop: "4px" }}>{roleDisplay}</div>
            </div>
          </div>

          {isOwnerRole && (
            <div style={{
              background: "var(--im-warning-bg, #fff3cd)",
              border: "1px solid var(--im-warning-border, #ffc107)",
              borderRadius: "6px",
              padding: "15px",
              marginBottom: "20px",
              color: "var(--im-warning-text, #856404)"
            }}>
              ⚠️ {t("invites.ownerWarning")}
            </div>
          )}

          <button
            onClick={handleAcceptInvite}
            disabled={loadingState === "accepting"}
            className="im-auth-button"
            style={{ marginBottom: "10px" }}
          >
            {loadingState === "accepting" ? t("invites.accepting") : t("invites.acceptInvite")}
          </button>

          <button
            onClick={() => router.push("/")}
            disabled={loadingState === "accepting"}
            className="im-auth-button"
            style={{ 
              background: "transparent",
              border: "1px solid var(--im-border-color)",
              color: "var(--im-text-primary)"
            }}
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    );
  }

  // Default loading state
  return (
    <div className="im-auth-card">
      <div className="text-center" style={{ color: "var(--im-auth-text)" }}>
        {t("common.loading")}
      </div>
    </div>
  );
}

function formatRoleForDisplay(role: string): string {
  const roleMap: Record<string, string> = {
    ORGANIZATION_OWNER: "Organization Owner",
    ORGANIZATION_ADMIN: "Organization Administrator",
    CLUB_OWNER: "Club Owner",
    CLUB_ADMIN: "Club Administrator",
  };

  return roleMap[role] || role;
}
