"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
        setError("Invalid email or password");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#2563eb]">
            <Shield size={20} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-lg font-bold text-[#0f172a]">RASP</span>
            <span className="text-lg font-bold text-[#2563eb]"> Platform</span>
          </div>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-8 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <h1 className="text-xl font-semibold text-[#0f172a] mb-1">Sign in</h1>
          <p className="text-sm text-[#475569] mb-6">
            Access your security dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Label htmlFor="password">Password</Label>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-[#dc2626] bg-[#fef2f2] border border-[#fecaca] rounded-[8px] px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e2e8f0]">
            <p className="text-xs text-center text-[#94a3b8]">
              Demo credentials:{" "}
              <span className="font-mono text-[#475569]">demo@acme.io</span> /{" "}
              <span className="font-mono text-[#475569]">demo1234</span>
            </p>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-[#94a3b8]">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#2563eb] hover:underline font-medium">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
