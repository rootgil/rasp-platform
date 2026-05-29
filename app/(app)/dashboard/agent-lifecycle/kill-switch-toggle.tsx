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

export function KillSwitchToggle({
  agentId,
  enabled,
}: {
  agentId: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killSwitch: !enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Failed to update kill switch");
      } else {
        toast.success(enabled ? "Agent re-enabled" : "Kill switch activated");
      }
      router.refresh();
    } catch {
      toast.error("Failed to update kill switch");
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <Button
        variant={enabled ? "secondary" : "danger"}
        size="sm"
        onClick={() => setConfirming(true)}
      >
        {enabled ? "Re-enable agent" : "Kill switch"}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enabled ? "Re-enable agent?" : "Enable kill switch?"}
            </DialogTitle>
            <DialogDescription>
              {enabled
                ? "The agent will resume normal operation on its next heartbeat."
                : "The agent will self-disable within 60 seconds. The application will continue running without RASP protection."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant={enabled ? "default" : "danger"}
              onClick={toggle}
              disabled={loading}
            >
              {loading ? "…" : enabled ? "Re-enable agent" : "Confirm kill switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
