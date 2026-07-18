"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-brand-light)_0%,transparent_55%)]"
      />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center text-center">
        <Link href="/" className="mb-10">
          <img src="/logo.png" alt="Queno" className="h-14 w-auto sm:h-16" />
        </Link>

        <p className="mb-3 font-mono text-sm font-semibold tracking-widest text-brand uppercase">
          Something went wrong
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
          Unexpected error
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-text-secondary sm:text-base">
          An unexpected error occurred. You can try again, or return to the
          dashboard.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-text-muted">
            Ref: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/dashboard">Go to dashboard</Link>
          </Button>
        </div>

        <p className="mt-10 text-xs text-text-muted">
          Need help?{" "}
          <Link href="/contact" className="font-medium text-brand hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
