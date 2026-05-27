import { Shield } from "lucide-react";
import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#2563eb]">
            <Shield size={20} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <span className="text-lg font-bold text-[#0f172a]">RASP</span>
            <span className="text-lg font-bold text-[#2563eb]"> Platform</span>
          </div>
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-[12px] p-8">
          <h1 className="text-xl font-semibold text-[#0f172a] mb-2">Request Access</h1>
          <p className="text-sm text-[#475569] mb-6">
            RASP Platform is invite-only during beta. Contact us to request access for your organization.
          </p>
          <Link
            href="/contact"
            className="inline-flex h-10 items-center justify-center rounded-[8px] bg-[#2563eb] px-6 text-sm font-medium text-white hover:bg-[#1d4ed8] transition-colors"
          >
            Contact sales
          </Link>
          <p className="mt-4 text-sm text-[#94a3b8]">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2563eb] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
