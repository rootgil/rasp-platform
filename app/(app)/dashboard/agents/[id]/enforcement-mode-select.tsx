"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
const MODE_LABELS: Record<string, string> = {
  monitor: "Monitor - detect only",
  block: "Block - enforce rules",
};

export function EnforcementModeSelect({
  agentId,
  currentMode,
  policyMode,
  projectName,
  channel,
}: {
  agentId: string;
  currentMode: string;
  policyMode: string | null;
  projectName: string;
  channel: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentMode);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = policyMode !== null && policyMode !== currentMode;

  const HEARTBEAT_MS = 60_000;
  const [progress, setProgress] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    if (!pending) return;
    setProgress(0);
    const start = performance.now();

    let raf: number;
    function tick() {
      const elapsed = performance.now() - start;
      const pct = Math.min(elapsed / HEARTBEAT_MS, 1);
      setProgress(pct * 100);
      if (pct < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        router.refresh();
        setCycleKey((k) => k + 1);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pending, cycleKey]);

  async function apply() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/agents/${agentId}/mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: selected }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        const msg = data?.error ?? "Failed to update mode";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success(`Mode changé en ${MODE_LABELS[selected] ?? selected}`);
      router.refresh();
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(value: string) {
    setSelected(value);
    if (value !== currentMode) {
      setConfirming(true);
    }
  }

  function handleCancel() {
    setConfirming(false);
    setSelected(currentMode);
    setError(null);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <StatusBadge status={currentMode} />
        <Select value={selected} onValueChange={handleSelect}>
          <SelectTrigger className="w-[220px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monitor">{MODE_LABELS.monitor}</SelectItem>
            <SelectItem value="block">{MODE_LABELS.block}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {pending && policyMode && (
        <div className="w-full max-w-[280px] flex flex-col gap-1 mt-0.5">
          <p className="text-xs text-text-muted">
            Pending →{" "}
            <span className="font-medium">{MODE_LABELS[policyMode] ?? policyMode}</span>
          </p>
          <div className="h-0.5 w-full rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-brand rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <Dialog open={confirming} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change enforcement mode?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-text-secondary">
                <p>
                  This change applies to all agents in application &ldquo;{projectName}&rdquo; on
                  the <span className="font-mono">{channel}</span> channel.
                </p>
                <p>
                  Switching to <strong>{MODE_LABELS[selected] ?? selected}</strong>.
                </p>
                {selected === "block" && (
                  <p className="text-critical">
                    Block mode will return HTTP 403 for suspicious requests detected by the agent.
                  </p>
                )}
                {error && <p className="text-critical">{error}</p>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              variant={selected === "block" ? "danger" : "default"}
              onClick={apply}
              disabled={loading || selected === currentMode}
            >
              {loading ? "…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
