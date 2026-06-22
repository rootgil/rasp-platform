"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InviteInfo {
  email: string;
  orgName: string;
  role: string;
  expiresAt: string;
}

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = await r.json();
          setError(d.error ?? "Invalid invitation");
        } else {
          setInfo(await r.json());
        }
      })
      .catch(() => setError("Failed to load invitation"))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setSubmitError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/invites/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password }),
      });
      if (!res.ok) {
        const d = await res.json();
        setSubmitError(d.error ?? "Failed to accept invitation");
      } else {
        router.push("/login?invited=1");
      }
    } catch {
      setSubmitError("Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Queno" className="h-16 w-auto" />
        </Link>

        <div className="bg-white border border-border rounded-lg p-8">
          {loading && (
            <p className="text-sm text-text-secondary text-center">Loading invitation…</p>
          )}

          {!loading && error && (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-text-primary mb-2">Invitation invalid</h1>
              <p className="text-sm text-text-secondary mb-6">{error}</p>
              <Link href="/login" className="text-sm text-brand hover:underline">
                Back to sign in
              </Link>
            </div>
          )}

          {!loading && info && (
            <>
              <h1 className="text-xl font-semibold text-text-primary mb-1">Create your account</h1>
              <p className="text-sm text-text-secondary mb-6">
                You&apos;ve been invited to join <strong>{info.orgName}</strong>.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
                  <input
                    type="email"
                    value={info.email}
                    disabled
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-text-secondary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoFocus
                    placeholder="Jane Smith"
                    className="w-full h-10 rounded-md border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="w-full h-10 rounded-md border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Confirm password</label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat your password"
                    className="w-full h-10 rounded-md border border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>

                {submitError && (
                  <p className="text-sm text-red-600">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 rounded-md bg-brand text-white text-sm font-medium hover:bg-brand-hover disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Creating account…" : "Create account"}
                </button>
              </form>

              <p className="mt-4 text-xs text-text-muted text-center">
                Already have an account?{" "}
                <Link href="/login" className="text-brand hover:underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
