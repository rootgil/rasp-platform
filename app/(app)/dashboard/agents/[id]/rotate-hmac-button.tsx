"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Copy, Check } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";

export function RotateHmacButton({ agentId }: { agentId: string }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hmacSecret, setHmacSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRotate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/rotate-hmac`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hmacSecret?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Failed to rotate HMAC secret");
        return;
      }
      setConfirmOpen(false);
      setHmacSecret(data.hmacSecret ?? null);
      setOpen(true);
      toast.success("HMAC secret rotated");
    } catch {
      toast.error("Failed to rotate HMAC secret");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!hmacSecret) return;
    const ok = await copyToClipboard(hmacSecret);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClose() {
    setOpen(false);
    setHmacSecret(null);
    setCopied(false);
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setConfirmOpen(true)}>
        Rotate HMAC secret
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rotate HMAC secret?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-text-secondary">
            This invalidates the current secret immediately. The agent must be
            reconfigured with the new value. The old secret cannot be recovered.
          </p>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleRotate} disabled={loading}>
              {loading ? "Rotating…" : "Rotate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : setOpen(v))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New HMAC secret — copy it now</DialogTitle>
          </DialogHeader>
          <div className="rounded-md bg-critical-bg border border-[#fecaca] p-3 text-sm text-critical-text">
            This value will not be shown again. Update RASP_HMAC_SECRET on the agent.
          </div>
          {hmacSecret && (
            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary uppercase tracking-wide">
                RASP_HMAC_SECRET
              </Label>
              <div className="relative">
                <div className="rounded-md bg-text-primary p-3 pr-10 font-mono text-xs text-border break-all">
                  {hmacSecret}
                </div>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute right-2 top-2 rounded-sm p-1.5 text-text-muted hover:text-white transition-colors"
                >
                  {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" onClick={handleClose}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
