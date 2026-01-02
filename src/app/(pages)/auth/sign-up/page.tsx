"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ImAuthInput, IMLink } from "@/components/ui";
import { GoogleLoginButton } from "@/components/auth/GoogleLoginButton";
import { validateRedirectUrl } from "@/utils/redirectValidation";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [name, setName] = useState("Ihor Metko");
  const [email, setEmail] = useState("ihor.metko@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Get and validate redirectTo from query params
  const redirectTo = validateRedirectUrl(searchParams.get("redirectTo"));
  const inviteToken = searchParams.get("inviteToken");
  const prefilledEmail = searchParams.get("email");
  const isFromInvite = !!inviteToken;

  // Pre-fill email if coming from invite
  useEffect(() => {
    if (prefilledEmail && !email) {
      setEmail(prefilledEmail);
    }
  }, [prefilledEmail, email]);

  const isPasswordValid = password.length >= MIN_PASSWORD_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError(t("auth.passwordMinLength", { minLength: MIN_PASSWORD_LENGTH }));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t("auth.registrationFailed"));
        setLoading(false);
        return;
      }

      // If coming from invite, automatically sign in and redirect back to accept page
      if (isFromInvite && redirectTo) {
        try {
          // Import signIn from next-auth
          const { signIn } = await import("next-auth/react");
          
          const signInResult = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (signInResult?.error) {
            // If auto sign-in fails, redirect to sign-in page manually
            const signInUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`;
            router.push(signInUrl);
          } else {
            // Successfully signed in, redirect to the invite acceptance page
            router.push(redirectTo);
          }
        } catch (signInError) {
          console.error("Auto sign-in error:", signInError);
          // Fallback to manual sign-in redirect
          const signInUrl = `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`;
          router.push(signInUrl);
        }
      } else {
        // Normal registration flow - redirect to sign-in
        const signInUrl = redirectTo 
          ? `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
          : "/auth/sign-in";
        router.push(signInUrl);
      }
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="im-auth-card">
      {/* Header */}
      <div className="im-auth-card-header">
        <h1 className="im-auth-card-title">{t("auth.registerTitle")}</h1>
        <p className="im-auth-card-subtitle">
          {isFromInvite 
            ? t("auth.inviteRegisterSubtitle")
            : t("auth.registerSubtitle")
          }
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="im-auth-form">
        {/* Error message */}
        {error && (
          <div role="alert" className="im-auth-error">
            {error}
          </div>
        )}

        {/* Name field */}
        <div className="im-auth-input-group">
          <label htmlFor="name" className="im-auth-label">
            {t("common.name")}
          </label>
          <ImAuthInput
            id="name"
            type="text"
            placeholder={t("auth.enterName")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

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
            readOnly={isFromInvite}
            disabled={isFromInvite}
            style={isFromInvite ? { 
              backgroundColor: "var(--im-input-disabled-bg, #f5f5f5)",
              cursor: "not-allowed"
            } : undefined}
          />
          {isFromInvite && (
            <p className="im-auth-validation" style={{ color: "var(--im-text-secondary)" }}>
              {t("auth.emailPrefilledFromInvite")}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="im-auth-input-group">
          <label htmlFor="password" className="im-auth-label">
            {t("common.password")}
          </label>
          <ImAuthInput
            id="password"
            type="password"
            placeholder={t("auth.createPassword")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            showPasswordToggle
          />
          {password.length > 0 && !isPasswordValid && (
            <p className="im-auth-validation">
              {t("auth.passwordMinLength", { minLength: MIN_PASSWORD_LENGTH })}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="im-auth-button"
        >
          {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
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
          {t("auth.alreadyHaveAccount")}{" "}
          <IMLink
            href={redirectTo ? `/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}` : "/auth/sign-in"}
            className="im-auth-link"
          >
            {t("common.signIn")}
          </IMLink>
        </p>
      </div>
    </div>
  );
}
