"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

const CHANNEL_LABELS: Record<string, string> = {
  stable: "Stable — 2-week delay after canary",
  early: "Early — 1-week delay after canary",
  edge: "Edge — latest build (non-production only)",
};

const CHANNEL_RISK: Record<string, "low" | "medium" | "high"> = {
  stable: "low",
  early: "medium",
  edge: "high",
};

export function ChannelSelect({
  agentId,
  currentChannel,
  currentPinnedVersion,
  latestStableVersion,
}: {
  agentId: string;
  currentChannel: string;
  currentPinnedVersion: string | null;
  latestStableVersion: string | null;
}) {
  const router = useRouter();
  const [selectedChannel, setSelectedChannel] = useState(currentChannel);
  const [pinnedVersion, setPinnedVersion] = useState(currentPinnedVersion ?? "");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const pinnedBehindLatest =
    pinnedVersion &&
    latestStableVersion &&
    pinnedVersion !== latestStableVersion;

  async function apply() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: selectedChannel,
          pinnedVersion: pinnedVersion.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Failed to update channel");
        return;
      }
      toast.success("Channel settings updated");
      router.refresh();
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    setConfirming(false);
    setSelectedChannel(currentChannel);
    setPinnedVersion(currentPinnedVersion ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm text-text-secondary">Update channel</Label>
        <Select
          value={selectedChannel}
          onValueChange={(v) => setSelectedChannel(v)}
        >
          <SelectTrigger className="w-full h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHANNEL_LABELS).map(([k, label]) => (
              <SelectItem key={k} value={k}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedChannel === "edge" && (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle size={12} />
            Edge receives unvalidated builds. Use only in non-production environments.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-text-secondary">
          Pin to version{" "}
          <span className="text-text-muted font-normal">(leave empty to follow channel)</span>
        </Label>
        <Input
          value={pinnedVersion}
          onChange={(e) => setPinnedVersion(e.target.value)}
          placeholder={latestStableVersion ?? "e.g. 1.4.2"}
          className="h-9 text-sm font-mono"
        />
        {pinnedBehindLatest && (
          <p className="flex items-center gap-1.5 text-xs text-warning">
            <AlertTriangle size={12} />
            Pinned version {pinnedVersion} is behind the latest stable ({latestStableVersion}). Update when ready.
          </p>
        )}
      </div>

      <Button
        size="sm"
        variant="default"
        disabled={
          selectedChannel === currentChannel &&
          (pinnedVersion.trim() || null) === currentPinnedVersion
        }
        onClick={() => setConfirming(true)}
      >
        Save channel settings
      </Button>

      <Dialog open={confirming} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update channel settings?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-text-secondary">
                <p>
                  Channel:{" "}
                  <span className="font-medium text-text-primary capitalize">{selectedChannel}</span>
                  {CHANNEL_RISK[selectedChannel] === "high" && (
                    <span className="ml-2 text-xs text-warning font-medium">⚠ High risk</span>
                  )}
                </p>
                {pinnedVersion.trim() ? (
                  <p>
                    Pinned to version:{" "}
                    <span className="font-mono font-medium text-text-primary">{pinnedVersion.trim()}</span>
                  </p>
                ) : (
                  <p>No version pin — agent will follow channel automatically.</p>
                )}
                {selectedChannel === "edge" && (
                  <p className="text-warning">
                    This agent will receive unvalidated builds. Only use in non-production.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant={CHANNEL_RISK[selectedChannel] === "high" ? "danger" : "default"}
              onClick={apply}
              disabled={loading}
            >
              {loading ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
