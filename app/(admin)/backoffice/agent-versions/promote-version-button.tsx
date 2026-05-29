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

export function PromoteVersionButton({ versionId, version }: { versionId: string; version: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function promote() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backoffice/agent-versions/${versionId}/promote`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? "Promote failed");
      }
      setOpen(false);
      toast.success(`v${version} promue en stable`);
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
      <Button size="sm" onClick={() => { setError(null); setOpen(true); }}>
        Promote to stable
      </Button>

      <Dialog open={open} onOpenChange={(o) => !o && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote v{version} to published?</DialogTitle>
            <DialogDescription>
              This will make version {version} available for agent updates.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-critical">{error}</p>}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={promote} disabled={loading}>
              {loading ? "Promoting…" : "Confirm promote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
