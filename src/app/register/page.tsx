"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
        setError(data.error || "Registration failed");
      } else {
        router.push("/login");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="rsp-container min-h-screen p-8 flex items-center justify-center">
      <Card title="Register" className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rsp-error bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rsp-form-group">
            <Input
              label="Name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="rsp-form-group">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="rsp-form-group">
            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="rsp-button-group">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </div>
          <p className="rsp-text text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="rsp-link text-blue-500 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </Card>
    </main>
  );
}
