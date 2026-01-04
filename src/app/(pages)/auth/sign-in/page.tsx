"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImAuthInput, IMLink } from "@/components/ui";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { getRoleHomepage } from "@/utils/roleRedirect";
import { validateRedirectUrl } from "@/utils/redirectValidation";
import { useUserStore } from "@/stores/useUserStore";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const loadUser = useUserStore(state => state.loadUser);
  const user = useUserStore(state => state.user);
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
    if (sessionStatus === "authenticated" && user) {
      const targetPath = redirectTo || getRoleHomepage(user.isRoot);
      router.push(targetPath);
    }
  }, [sessionStatus, user, router, redirectTo]);

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
        // Load user data into the store after successful sign-in
        await loadUser();

        // Get the updated user from the store
        const currentUser = useUserStore.getState().user;

        if (currentUser) {
          handleRedirect(
            currentUser.name,
            currentUser.isRoot
          );
        } else {
          // Fallback: redirect to default page if user load fails
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
  if (sessionStatus === "loading") {
    return (
      <div className="im-auth-card">
        <div className="text-center" style={{ color: "var(--im-auth-text)" }}>
          {t("common.loading")}
        </div>
      </div>
    );
  }

  // If already authenticated, show loading while redirecting
  if (sessionStatus === "authenticated") {
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
            <ImAuthInput
              id="email"
              type="email"
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
            <ImAuthInput
              id="password"
              type="password"
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

        {/* Divider */}
        <div className="im-auth-divider">
          <span className="im-auth-divider-text">{t("auth.orContinueWith")}</span>
        </div>

        {/* Google Login Button */}
        <GoogleLoginButton callbackUrl={redirectTo || "/dashboard"} />

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

        {/* Club owners documentation link */}
        <div className="im-auth-links" style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--im-auth-input-border)" }}>
          <p className="im-auth-link-text" style={{ fontSize: "0.875rem" }}>
            {t("auth.runningPadelClub")}{" "}
            <IMLink
              href="/docs/for-clubs/overview"
              className="im-auth-link"
            >
              {t("auth.learnHowPlatformWorks")} →
            </IMLink>
          </p>
          <p className="im-auth-link-text" style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
            {t("auth.tryDemoAccount")}{" "}
            <IMLink
              href="/docs/pre-sales"
              className="im-auth-link"
            >
              {t("auth.viewPreSalesDocs")} →
            </IMLink>
          </p>
        </div>
      </div>
    </>
  );
}
