"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button, Card, Input } from "@/components/ui";

const MIN_PASSWORD_LENGTH = 8;

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations();
  const [name, setName] = useState("Ihor Metko");
  const [email, setEmail] = useState("ihor.metko@gmail.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      } else {
        router.push("/auth/sign-in");
      }
    } catch {
      setError(t("auth.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rsp-container min-h-screen p-8 flex items-center justify-center">
      <Card title={t("auth.registerTitle")} className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded-sm">
              {error}
            </div>
          )}
          <div className="rsp-form-group">
            <Input
              label={t("common.name")}
              type="text"
              placeholder={t("auth.enterName")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              placeholder={t("auth.createPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
            {password.length > 0 && !isPasswordValid && (
              <p className="text-sm text-red-500 mt-1">
                {t("auth.passwordMinLength", { minLength: MIN_PASSWORD_LENGTH })}
              </p>
            )}
          </div>
          <div className="rsp-button-group">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t("auth.creatingAccount") : t("auth.createAccount")}
            </Button>
          </div>
          <p className="rsp-text text-center text-sm">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link href="/auth/sign-in" className="rsp-link text-blue-500 hover:underline">
              {t("common.signIn")}
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
