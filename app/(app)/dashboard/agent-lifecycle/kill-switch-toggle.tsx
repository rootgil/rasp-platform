"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      await fetch(`/api/agents/${agentId}/kill-switch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ killSwitch: !enabled }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <Button
        variant={enabled ? "danger" : "secondary"}
        size="sm"
        onClick={() => setConfirming(true)}
      >
        {enabled ? "Disable agent" : "Kill switch"}
      </Button>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {enabled ? "Disable kill switch?" : "Enable kill switch?"}
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
              {loading ? "…" : enabled ? "Re-enable" : "Confirm kill switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
