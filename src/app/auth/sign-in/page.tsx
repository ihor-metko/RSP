"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Card, Input, IMLink } from "@/components/ui";
import { getRoleHomepage } from "@/utils/roleRedirect";
import type { UserRole } from "@/lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const { data: session, status, update: updateSession } = useSession();
  const t = useTranslations();
  const [email, setEmail] = useState("ihor.metko@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Clear toast after display
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Redirect already logged-in users to their role-specific homepage
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const redirectPath = getRoleHomepage(session.user.role as UserRole | undefined);
      router.push(redirectPath);
    }
  }, [status, session, router]);

  const handleRedirect = useCallback((userName: string | null | undefined, userRole: UserRole | undefined) => {
    const redirectPath = getRoleHomepage(userRole);
    
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
  }, [router, t]);

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
            updatedSession.user.role as UserRole | undefined
          );
        } else {
          // Fallback: redirect to default player page if session update fails
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
      <main className="rsp-container min-h-screen p-8 flex items-center justify-center">
        <div className="rsp-loading text-center">{t("common.loading")}</div>
      </main>
    );
  }

  // If already authenticated, show loading while redirecting
  if (status === "authenticated") {
    return (
      <main className="rsp-container min-h-screen p-8 flex items-center justify-center">
        <div className="rsp-loading text-center">{t("common.loading")}</div>
      </main>
    );
  }

  return (
    <main className="rsp-container min-h-screen p-8 flex items-center justify-center">
      {/* Toast Notification */}
      {toast && (
        <div
          role="alert"
          className="fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-400"
        >
          {toast}
        </div>
      )}

      <Card title={t("auth.login")} className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {error}
            </div>
          )}
          <div className="rsp-form-group">
            <Input
              label={t("common.email")}
              type="email"
              placeholder={t("auth.enterEmail")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="rsp-form-group">
            <Input
              label={t("common.password")}
              type="password"
              placeholder={t("auth.enterPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="rsp-button-group">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("auth.signingIn") : t("common.signIn")}
            </Button>
          </div>
          <p className="rsp-text text-center text-sm">
            {t("auth.dontHaveAccount")}{" "}
            <IMLink href="/auth/sign-up">
              {t("common.register")}
            </IMLink>
          </p>
        </form>
      </Card>
    </main>
  );
}
