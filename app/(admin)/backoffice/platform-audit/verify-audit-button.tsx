"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert } from "lucide-react";

type Result = { ok: boolean; brokenAt: string | null };

export function VerifyAuditButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function verify() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/audit/verify");
      if (!res.ok) throw new Error("Request failed");
      setResult(await res.json() as Result);
    } catch {
      setResult({ ok: false, brokenAt: "unknown (request error)" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        result.ok ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-success-bg border-[#bbf7d0] text-success-text">
            <ShieldCheck size={13} />
            Chain intact
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-critical-bg border-[#fecaca] text-critical-text">
            <ShieldAlert size={13} />
            Tampering at {result.brokenAt}
          </span>
        )
      )}
      <Button variant="secondary" size="sm" onClick={verify} disabled={loading}>
        {loading ? "Verifying…" : "Verify integrity"}
      </Button>
    </div>
  );
}
