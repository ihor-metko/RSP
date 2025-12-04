"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input, IMLink } from "@/components/ui";
import { getRoleHomepage } from "@/utils/roleRedirect";
import { validateRedirectUrl } from "@/utils/redirectValidation";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update: updateSession } = useSession();
  const t = useTranslations();
  const [email, setEmail] = useState("ihor.metko@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Get and validate redirectTo from query params
  const redirectTo = validateRedirectUrl(searchParams.get("redirectTo"));

  // Clear toast after display
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Redirect already logged-in users to their role-specific homepage or redirectTo
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const targetPath = redirectTo || getRoleHomepage(session.user.isRoot);
      router.push(targetPath);
    }
  }, [status, session, router, redirectTo]);

  const handleRedirect = useCallback((userName: string | null | undefined, isRoot: boolean | undefined) => {
    // Prefer redirectTo from query params, fallback to role-based homepage
    const redirectPath = redirectTo || getRoleHomepage(isRoot);

    // Show welcome toast if user has a name
    if (userName) {
      setToast(t("auth.welcomeBack", { name: userName }));
      // Wait briefly to show toast before redirect
      setTimeout(() => {
        router.push(redirectPath);
        router.refresh();
      }, 1000);
    } else {
      router.push(redirectPath);
      router.refresh();
    }
  }, [router, t, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("auth.invalidCredentials"));
      } else {
        // Refresh the session to get updated user data
        const updatedSession = await updateSession();

        if (updatedSession?.user) {
          handleRedirect(
            updatedSession.user.name,
            updatedSession.user.isRoot
          );
        } else {
          // Fallback: redirect to default page if session update fails
          router.push(getRoleHomepage(undefined));
          router.refresh();
        }
      }
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <div className="im-auth-card">
        <div className="text-center" style={{ color: "var(--im-auth-text)" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  // If already authenticated, show loading while redirecting
  if (status === "authenticated") {
    return (
      <div className="im-auth-card">
        <div className="text-center" style={{ color: "var(--im-auth-text)" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div role="alert" className="im-auth-toast">
          {toast}
        </div>
      )}

      <div className="im-auth-card">
        {/* Header */}
        <div className="im-auth-card-header">
          <h1 className="im-auth-card-title">{t("auth.signInTitle")}</h1>
          <p className="im-auth-card-subtitle">{t("auth.signInSubtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="im-auth-form">
          {/* Error message */}
          {error && (
            <div role="alert" className="im-auth-error">
              {error}
            </div>
          )}

          {/* Email field */}
          <div className="im-auth-input-group">
            <label htmlFor="email" className="im-auth-label">
              {t("common.email")}
            </label>
            <input
              id="email"
              type="email"
              className="im-auth-input"
              placeholder={t("auth.enterEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {/* Password field */}
          <div className="im-auth-input-group">
            <label htmlFor="password" className="im-auth-label">
              {t("common.password")}
            </label>
            <Input
              id="password"
              type="password"
              className="im-auth-input"
              placeholder={t("auth.enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              showPasswordToggle
            />
          </div>

          {/* Forgot password link */}
          <div className="text-right">
            <IMLink href="#" className="im-auth-forgot-link">
              {t("auth.forgotPassword")}
            </IMLink>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="im-auth-button"
          >
            {loading ? t("auth.signingIn") : t("common.signIn")}
          </button>
        </form>

        {/* Links section */}
        <div className="im-auth-links">
          <p className="im-auth-link-text">
            {t("auth.dontHaveAccount")}{" "}
            <IMLink
              href={redirectTo ? `/auth/sign-up?redirectTo=${encodeURIComponent(redirectTo)}` : "/auth/sign-up"}
              className="im-auth-link"
            >
              {t("common.register")}
            </IMLink>
          </p>
        </div>
      </div>
    </>
  );
}
