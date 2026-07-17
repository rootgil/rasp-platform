"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RevokeInviteButton({
  invitationId,
  email,
}: {
  invitationId: string;
  email: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function revoke() {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/invite/${invitationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Failed to revoke invitation");
        return;
      }
      setOpen(false);
      toast.success("Invitation revoked");
      router.refresh();
    } catch {
      toast.error("Failed to revoke invitation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="danger"
        className="h-7 w-7 p-0"
        title="Revoke invitation"
        aria-label={`Revoke invitation for ${email}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 size={13} />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke invitation?</DialogTitle>
            <DialogDescription>
              The pending invitation for <strong>{email}</strong> will be revoked.
              The invite link will stop working immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={revoke} disabled={loading}>
              {loading ? "Revoking…" : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
