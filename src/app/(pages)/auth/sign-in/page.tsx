"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImAuthInput, IMLink } from "@/components/ui";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { validateRedirectUrl } from "@/utils/redirectValidation";
import { useUserStore } from "@/stores/useUserStore";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionStatus = useUserStore(state => state.sessionStatus);
  const user = useUserStore(state => state.user);
  const t = useTranslations();
  const [email, setEmail] = useState("ihor.metko@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get and validate redirectTo from query params (not used for post-auth, but kept for future use)
  const redirectTo = validateRedirectUrl(searchParams.get("redirectTo"));

  // Redirect already logged-in users to /post-auth
  useEffect(() => {
    if (sessionStatus === "authenticated" && user) {
      router.push("/post-auth");
    }
  }, [sessionStatus, user, router]);

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
        // Redirect to post-auth for centralized routing
        router.push("/post-auth");
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
        <GoogleLoginButton />

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
  );
}
