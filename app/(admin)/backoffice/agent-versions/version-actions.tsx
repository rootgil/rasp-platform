"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type CanaryAction = "start" | "advance" | "halt" | "evaluate";

async function postCanary(versionId: string, action: CanaryAction, reason?: string) {
  const res = await fetch(`/api/backoffice/agent-versions/${versionId}/canary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
}

async function postRollback(versionId: string, reason: string) {
  const res = await fetch(`/api/backoffice/agent-versions/${versionId}/rollback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(data.error ?? "Request failed");
  }
  return res.json();
}

export function VersionActions({
  versionId,
  version,
  status,
  rolloutStage,
  halted,
  quarantined,
}: {
  versionId: string;
  version: string;
  status: string;
  rolloutStage: number;
  halted: boolean;
  quarantined: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rollbackOpen, setRollbackOpen] = useState(false);
  const [haltOpen, setHaltOpen] = useState(false);
  const [reason, setReason] = useState("");

  const CANARY_SUCCESS: Record<CanaryAction, string> = {
    start: `Canary démarré pour v${version}`,
    advance: `Canary avancé à l'étape suivante`,
    halt: `Canary arrêté pour v${version}`,
    evaluate: `Évaluation de santé terminée`,
  };

  async function doCanary(action: CanaryAction) {
    setLoading(true);
    setError(null);
    try {
      await postCanary(versionId, action);
      toast.success(CANARY_SUCCESS[action]);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function doRollback() {
    if (!reason.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await postRollback(versionId, reason.trim());
      setRollbackOpen(false);
      setReason("");
      toast.success(`v${version} a été rollbackée`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function doHalt() {
    setLoading(true);
    setError(null);
    try {
      await postCanary(versionId, "halt", reason.trim() || "Manual halt");
      setHaltOpen(false);
      setReason("");
      toast.success(`Canary arrêté pour v${version}`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (quarantined) {
    return <span className="text-xs text-text-muted">Quarantined</span>;
  }

  const isPublished = status === "published";
  const isCanaryRunning = isPublished && !halted && rolloutStage > 0 && rolloutStage < 4;
  const isCanaryHalted = isPublished && halted && rolloutStage > 0;
  const isComplete = isPublished && !halted && rolloutStage >= 4;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Start canary */}
      {isPublished && rolloutStage === 0 && !halted && (
        <Button size="sm" variant="secondary" onClick={() => doCanary("start")} disabled={loading}>
          Start canary
        </Button>
      )}

      {/* Advance canary */}
      {isCanaryRunning && (
        <Button size="sm" variant="secondary" onClick={() => doCanary("advance")} disabled={loading}>
          Advance
        </Button>
      )}

      {/* Evaluate health */}
      {isCanaryRunning && (
        <Button size="sm" variant="secondary" onClick={() => doCanary("evaluate")} disabled={loading}>
          Evaluate
        </Button>
      )}

      {/* Halt */}
      {isCanaryRunning && (
        <Button size="sm" variant="danger" onClick={() => { setReason(""); setHaltOpen(true); }} disabled={loading}>
          Halt
        </Button>
      )}

      {/* Rollback - available on any non-deprecated, non-complete published version */}
      {isPublished && !isComplete && (
        <Button size="sm" variant="danger" onClick={() => { setReason(""); setRollbackOpen(true); }} disabled={loading}>
          Rollback
        </Button>
      )}

      {isComplete && (
        <span className="text-xs text-success font-medium">100% - complete</span>
      )}

      {isCanaryHalted && (
        <span className="text-xs text-critical font-medium">Halted</span>
      )}

      {error && <p className="w-full text-xs text-critical mt-1">{error}</p>}

      {/* Halt dialog */}
      <Dialog open={haltOpen} onOpenChange={(open) => !open && setHaltOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Halt canary for v{version}?</DialogTitle>
            <DialogDescription>
              This stops the canary rollout immediately. You can provide an optional reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason <span className="text-text-muted">(optional)</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Elevated error rate on canary cohort"
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-critical">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHaltOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={doHalt} disabled={loading}>
              {loading ? "Halting…" : "Confirm halt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rollback dialog */}
      <Dialog open={rollbackOpen} onOpenChange={(open) => !open && setRollbackOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback v{version}?</DialogTitle>
            <DialogDescription>
              This halts and deprecates the version, and moves all affected agents back to their previous version.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason <span className="text-critical">*</span></Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Critical regression detected in canary"
              rows={2}
            />
          </div>
          {error && <p className="text-xs text-critical">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setRollbackOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={doRollback} disabled={loading || !reason.trim()}>
              {loading ? "Rolling back…" : "Confirm rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
