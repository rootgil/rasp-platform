import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <img src="/logo.png" alt="Queno" className="h-16 w-auto" />
        </Link>
        <div className="bg-white border border-border rounded-lg p-8">
          <h1 className="text-xl font-semibold text-text-primary mb-2">Request Access</h1>
          <p className="text-sm text-text-secondary mb-6">
            Queno is invite-only during beta. Contact us to request access for your organization.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-6 text-sm font-medium text-white hover:bg-brand-hover transition-colors"
          >
            Contact sales
          </Link>
          <p className="mt-4 text-sm text-text-muted">
            Already have an account?{" "}
            <Link href="/login" className="text-brand hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
