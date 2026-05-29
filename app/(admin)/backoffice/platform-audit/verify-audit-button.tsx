"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldAlert, Copy, Check, ExternalLink } from "lucide-react";
import type { AuditChainResult, AuditChainBrokenRecord } from "@/lib/auth-helpers";

// ─── Verify button + chain intact badge ──────────────────────────────────────

export function VerifyAuditButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditChainResult | null>(null);

  async function verify() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/audit/verify");
      if (!res.ok) throw new Error("Request failed");
      setResult(await res.json() as AuditChainResult);
    } catch {
      setResult({
        ok: false,
        brokenAt: "unknown",
        reason: "hash_mismatch",
        brokenRecord: null as unknown as AuditChainBrokenRecord,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex items-center gap-3">
        {result?.ok === true && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border bg-success-bg border-[#bbf7d0] text-success-text">
            <ShieldCheck size={13} />
            Chain intact
          </span>
        )}
        <Button variant="secondary" size="sm" onClick={verify} disabled={loading}>
          {loading ? "Verifying…" : "Verify integrity"}
        </Button>
      </div>

      {result?.ok === false && (
        <TamperingPanel result={result} onAcknowledged={() => setResult(null)} />
      )}
    </div>
  );
}

// ─── Detail panel shown when the chain is broken ─────────────────────────────

function TamperingPanel({
  result,
  onAcknowledged,
}: {
  result: Extract<AuditChainResult, { ok: false }>;
  onAcknowledged: () => void;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showAck, setShowAck] = useState(false);
  const [note, setNote] = useState("");
  const [acking, setAcking] = useState(false);
  const [ackDone, setAckDone] = useState(false);

  const rec = result.brokenRecord;

  const reasonLabel =
    result.reason === "prev_link_broken"
      ? "Chain link broken (record may be reordered or inserted)"
      : "Hash mismatch (record content was modified)";

  function buildReport(): string {
    const lines = [
      "=== AUDIT TAMPERING INCIDENT ===",
      `Broken record ID : ${result.brokenAt}`,
      `Reason           : ${reasonLabel}`,
    ];
    if (rec) {
      lines.push(
        `Action           : ${rec.action}`,
        `Target           : ${rec.target ?? "-"}`,
        `Actor            : ${rec.actor ?? "system"}`,
        `Organization     : ${rec.organization ?? "-"}`,
        `Timestamp        : ${rec.createdAt}`,
        "",
        `Stored prevHash  : ${rec.prevHash ?? "(null)"}`,
        `Stored hash      : ${rec.storedHash ?? "(null)"}`,
        `Expected hash    : ${rec.expectedHash}`,
      );
    }
    lines.push("", "All records after this point are suspect. Investigate DB access logs.");
    return lines.join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildReport());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleJump() {
    router.push(`?highlight=${result.brokenAt}`);
    setTimeout(() => {
      document.getElementById(`row-${result.brokenAt}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  }

  async function handleAcknowledge() {
    setAcking(true);
    try {
      const res = await fetch("/api/admin/audit/acknowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brokenAt: result.brokenAt, note: note.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed");
      setAckDone(true);
      setTimeout(onAcknowledged, 2000);
    } catch {
      alert("Failed to acknowledge. Please try again.");
    } finally {
      setAcking(false);
    }
  }

  return (
    <div className="w-full rounded-lg border border-[#fecaca] bg-critical-bg text-xs space-y-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-critical-text font-semibold">
          <ShieldAlert size={14} />
          Tampering detected
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            title="Copy incident report"
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-background text-text-secondary hover:text-text-primary transition-colors"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy report"}
          </button>
          <button
            onClick={handleJump}
            title="Jump to row in table"
            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border bg-background text-text-secondary hover:text-text-primary transition-colors"
          >
            <ExternalLink size={12} />
            Jump to record
          </button>
        </div>
      </div>

      {/* Record fields */}
      {rec ? (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
          <dt className="text-text-muted font-medium">Broken record</dt>
          <dd className="font-mono text-text-primary">{rec.id}</dd>

          <dt className="text-text-muted font-medium">Reason</dt>
          <dd className="text-critical-text">{reasonLabel}</dd>

          <dt className="text-text-muted font-medium">Action</dt>
          <dd className="font-mono text-brand">{rec.action}</dd>

          {rec.target && (
            <>
              <dt className="text-text-muted font-medium">Target</dt>
              <dd className="font-mono text-text-primary break-all">{rec.target}</dd>
            </>
          )}

          <dt className="text-text-muted font-medium">Actor</dt>
          <dd className="text-text-primary">{rec.actor ?? "system"}</dd>

          {rec.organization && (
            <>
              <dt className="text-text-muted font-medium">Organization</dt>
              <dd className="text-text-primary">{rec.organization}</dd>
            </>
          )}

          <dt className="text-text-muted font-medium">Timestamp</dt>
          <dd className="font-mono text-text-muted">{new Date(rec.createdAt).toLocaleString()}</dd>

          <dt className="text-text-muted font-medium col-span-2 mt-1 border-t border-[#fecaca] pt-2">Hash details</dt>

          <dt className="text-text-muted font-medium">Stored prevHash</dt>
          <dd className="font-mono text-text-muted break-all">{rec.prevHash ?? "(null)"}</dd>

          <dt className="text-text-muted font-medium">Stored hash</dt>
          <dd className="font-mono text-text-muted break-all">{rec.storedHash ?? "(null)"}</dd>

          <dt className="text-text-muted font-medium">Expected hash</dt>
          <dd className="font-mono text-text-primary break-all">{rec.expectedHash}</dd>
        </dl>
      ) : (
        <p className="text-text-muted">
          Broken at <span className="font-mono">{result.brokenAt}</span> - record could not be loaded.
        </p>
      )}

      {/* Advisory */}
      <p className="text-text-muted border-t border-[#fecaca] pt-2">
        All records after this point are suspect. Investigate database access logs and export this report before making further changes.
      </p>

      {/* Acknowledge */}
      {ackDone ? (
        <div className="flex items-center gap-1.5 text-success-text font-medium">
          <Check size={13} />
          Incident acknowledged and recorded in audit log.
        </div>
      ) : showAck ? (
        <div className="space-y-2 border-t border-[#fecaca] pt-3">
          <p className="text-text-secondary font-medium">Acknowledge incident</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional investigation note…"
            rows={3}
            className="w-full rounded border border-border bg-background px-3 py-2 text-xs text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAcknowledge} disabled={acking} className="h-7 text-xs">
              {acking ? "Acknowledging…" : "Confirm acknowledgement"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAck(false)} className="h-7 text-xs">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowAck(true)}
          className="h-7 text-xs"
        >
          Acknowledge incident…
        </Button>
      )}
    </div>
  );
}
