"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GitCompare, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";

type VersionSummary = {
  id: string;
  version: string;
  channel: string;
  status: string;
  rolloutStage: number;
  rolloutPercent: number;
  halted: boolean;
  quarantined: boolean;
  changelog: string | null;
  impact: string | null;
  releasedAt: string | null;
};

type RolloutMetric = {
  stage: number;
  errorRate: number | null;
  p99LatencyMs: number | null;
  haltedAt: string | null;
  createdAt: string;
};

const STAGE_LABELS: Record<number, string> = {
  0: "Not started",
  1: "Stage 1 — 1%",
  2: "Stage 2 — 10%",
  3: "Stage 3 — 50%",
  4: "Stage 4 — 100%",
};

function VersionPanel({
  version,
  metrics,
  label,
}: {
  version: VersionSummary;
  metrics: RolloutMetric[];
  label: "Current" | "Candidate";
}) {
  const labelColor =
    label === "Current"
      ? "text-text-muted bg-background border-border"
      : "text-[#2563eb] bg-[#eff6ff] border-[#bfdbfe]";

  return (
    <div className="space-y-4 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${labelColor}`}>
          {label}
        </span>
        <span className="font-mono text-sm font-bold text-text-primary">v{version.version}</span>
        <span className="text-xs text-text-muted capitalize">{version.channel}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <StatusBadge status={version.status} />
        {version.halted && <StatusBadge status="halted" />}
        {version.quarantined && <StatusBadge status="quarantined" />}
        <span className="text-xs text-text-muted">
          {STAGE_LABELS[version.rolloutStage] ?? `${version.rolloutPercent}%`}
        </span>
      </div>

      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Changelog</p>
        <div className="rounded-md border border-border bg-background p-3 text-xs text-text-secondary whitespace-pre-wrap min-h-[80px]">
          {version.changelog ?? <span className="text-text-muted italic">No changelog provided.</span>}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-text-secondary uppercase mb-1">Impact / breaking changes</p>
        <div className={`rounded-md border p-3 text-xs whitespace-pre-wrap min-h-[60px] ${
          version.impact
            ? "border-[#fde68a] bg-medium-bg text-medium-text"
            : "border-border bg-background text-text-muted italic"
        }`}>
          {version.impact ?? "No impact notes provided."}
        </div>
      </div>

      {metrics.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase mb-2">Rollout metrics</p>
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-3 py-1.5 text-left font-medium text-text-secondary">Stage</th>
                  <th className="px-3 py-1.5 text-left font-medium text-text-secondary">Error rate</th>
                  <th className="px-3 py-1.5 text-left font-medium text-text-secondary">P99</th>
                  <th className="px-3 py-1.5 text-left font-medium text-text-secondary">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {metrics.map((m) => (
                  <tr key={m.stage}>
                    <td className="px-3 py-1.5 font-medium">{STAGE_LABELS[m.stage] ?? `Stage ${m.stage}`}</td>
                    <td className={`px-3 py-1.5 ${m.errorRate != null && m.errorRate > 0.01 ? "text-critical font-semibold" : ""}`}>
                      {m.errorRate != null ? `${(m.errorRate * 100).toFixed(2)}%` : "-"}
                    </td>
                    <td className={`px-3 py-1.5 ${m.p99LatencyMs != null && m.p99LatencyMs > 0 ? "" : ""}`}>
                      {m.p99LatencyMs != null ? `${m.p99LatencyMs} ms` : "-"}
                    </td>
                    <td className="px-3 py-1.5">
                      {m.haltedAt ? (
                        <span className="text-critical font-medium">Halted</span>
                      ) : (
                        <span className="text-success font-medium">OK</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function VersionCompareDialog({
  currentVersion,
  candidateVersion,
}: {
  currentVersion: VersionSummary;
  candidateVersion: VersionSummary;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<RolloutMetric[]>([]);
  const [candidateMetrics, setCandidateMetrics] = useState<RolloutMetric[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/backoffice/agent-versions/${currentVersion.id}/metrics`),
        fetch(`/api/backoffice/agent-versions/${candidateVersion.id}/metrics`),
      ]);
      if (res1.ok) setCurrentMetrics((await res1.json()) as RolloutMetric[]);
      if (res2.ok) setCandidateMetrics((await res2.json()) as RolloutMetric[]);
    } catch {
      toast.error("Failed to load rollout metrics");
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    load();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={handleOpen}>
        <GitCompare size={13} />
        Compare
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Pre-deployment comparison — v{currentVersion.version}{" "}
              <ChevronRight size={14} className="inline text-text-muted" />{" "}
              v{candidateVersion.version}
            </DialogTitle>
          </DialogHeader>

          {loading && <p className="text-sm text-text-muted py-4">Loading metrics…</p>}

          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <VersionPanel
                version={currentVersion}
                metrics={currentMetrics}
                label="Current"
              />
              <VersionPanel
                version={candidateVersion}
                metrics={candidateMetrics}
                label="Candidate"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
