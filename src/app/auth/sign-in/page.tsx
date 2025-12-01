"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, Input } from "@/components/ui";

export default function SignInPage() {
  const router = useRouter();
  const t = useTranslations();
  const [email, setEmail] = useState("ihor.metko@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        router.push("/");
        router.refresh();
      }
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rsp-container min-h-screen p-8 flex items-center justify-center">
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
            <Link href="/auth/sign-up" className="rsp-link text-blue-500 hover:underline">
              {t("common.register")}
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
