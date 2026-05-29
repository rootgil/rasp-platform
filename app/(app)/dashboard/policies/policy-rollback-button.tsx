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
import { RotateCcw } from "lucide-react";

export function PolicyRollbackButton({
  projectId,
  targetVersion,
}: {
  projectId: string;
  targetVersion: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doRollback() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/policies/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, targetVersion }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Rollback failed");
      }
      setOpen(false);
      toast.success(`Politique rollbackée à v${targetVersion}`);
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => { setError(null); setOpen(true); }}>
        <RotateCcw size={12} />
        Rollback to v{targetVersion}
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rollback to policy v{targetVersion}?</DialogTitle>
            <DialogDescription>
              This re-publishes version {targetVersion} as a new signed policy version. Agents will pick it up on their next heartbeat (within 60 s).
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-critical">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={doRollback} disabled={loading}>
              {loading ? "Rolling back…" : "Confirm rollback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
