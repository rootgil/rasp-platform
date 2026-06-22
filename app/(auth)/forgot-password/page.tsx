"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Queno" className="h-16 w-auto" />
        </Link>

        <div className="bg-white border border-border rounded-lg p-8">
          {sent ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text-primary mb-2">Check your email</h1>
              <p className="text-sm text-text-secondary mb-6">
                If an account exists for <strong>{email}</strong>, we sent a password reset link.
                It expires in 1 hour.
              </p>
              <Link href="/login" className="text-sm text-brand hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-text-primary mb-1">Forgot your password?</h1>
              <p className="text-sm text-text-secondary mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-10 rounded-md border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </button>
              </form>
              <p className="mt-4 text-sm text-center">
                <Link href="/login" className="text-brand hover:underline">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
