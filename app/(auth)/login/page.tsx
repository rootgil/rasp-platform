"use client";

import { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { sanitizeCallbackUrl } from "@/lib/safe-url";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsMfa, setNeedsMfa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function completeLogin(opts: { email: string; password: string; totpCode?: string }) {
    const result = await signIn("credentials", {
      email: opts.email,
      password: opts.password,
      totpCode: opts.totpCode,
      redirect: false,
    });
    if (result?.error) {
      return { ok: false as const };
    }
    const session = await getSession();
    const user = session?.user as { role?: string; mustChangePassword?: boolean } | undefined;
    if (user?.mustChangePassword) {
      router.push("/change-password");
    } else {
      router.push(user?.role === "admin" ? "/backoffice" : callbackUrl);
    }
    router.refresh();
    return { ok: true as const };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (needsMfa) {
        if (!/^\d{6}$/.test(totpCode)) {
          setError("Enter the 6-digit MFA code");
          toast.error("Enter the 6-digit MFA code");
          return;
        }
        const done = await completeLogin({ email, password, totpCode });
        if (!done.ok) {
          setError("Invalid MFA code");
          toast.error("Invalid MFA code");
        }
        return;
      }

      // First attempt without TOTP. If MFA is enabled, authorize returns null
      // and we probe with a dedicated check via a second attempt prompt.
      const probe = await fetch("/api/auth/mfa-required", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (probe.status === 429) {
        setError("Too many attempts. Try again later.");
        toast.error("Too many attempts");
        return;
      }
      if (probe.ok) {
        const data = (await probe.json()) as { mfaRequired?: boolean; valid?: boolean };
        if (!data.valid) {
          setError("Invalid email or password");
          toast.error("Invalid email or password");
          return;
        }
        if (data.mfaRequired) {
          setNeedsMfa(true);
          return;
        }
      }

      const done = await completeLogin({ email, password });
      if (!done.ok) {
        setError("Invalid email or password");
        toast.error("Invalid email or password");
      }
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

        <div className="bg-white border border-border rounded-lg p-8 shadow-card">
          <h1 className="text-xl font-semibold text-text-primary mb-1">
            {needsMfa ? "Two-factor authentication" : "Sign in"}
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            {needsMfa
              ? "Enter the 6-digit code from your authenticator app"
              : "Access your security dashboard"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!needsMfa ? (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link href="/forgot-password" className="text-xs text-brand hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="totp">Authenticator code</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  autoFocus
                />
                <button
                  type="button"
                  className="text-xs text-brand hover:underline"
                  onClick={() => {
                    setNeedsMfa(false);
                    setTotpCode("");
                  }}
                >
                  Back to password
                </button>
              </div>
            )}

            {error && (
              <p className="text-sm text-critical bg-critical-bg border border-[#fecaca] rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : needsMfa ? "Verify" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-brand hover:underline font-medium">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
