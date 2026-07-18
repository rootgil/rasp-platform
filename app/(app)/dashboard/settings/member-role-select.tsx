"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ORG_ROLES = ["owner", "admin", "member"] as const;

export function MemberRoleSelect({
  membershipId,
  memberEmail,
  currentRole,
  disabled,
}: {
  membershipId: string;
  memberEmail: string;
  currentRole: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [pendingRole, setPendingRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function apply(next: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/settings/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: next }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(d.error ?? "Failed to update role");
        return;
      }
      setRole(next);
      toast.success("Role updated");
      router.refresh();
      setPendingRole(null);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setLoading(false);
    }
  }

  if (disabled) {
    return (
      <span className="capitalize text-xs font-medium text-text-secondary">
        {role}
      </span>
    );
  }

  return (
    <>
      <Select
        value={role}
        onValueChange={(next) => {
          if (next === role) return;
          setPendingRole(next);
        }}
        disabled={loading}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ORG_ROLES.map((r) => (
            <SelectItem key={r} value={r} className="capitalize text-xs">
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog
        open={pendingRole !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRole(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change member role?</DialogTitle>
            <DialogDescription>
              Update <strong>{memberEmail}</strong> from{" "}
              <span className="capitalize font-medium text-text-primary">{role}</span>
              {" "}to{" "}
              <span className="capitalize font-medium text-text-primary">{pendingRole}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setPendingRole(null)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant={pendingRole === "owner" ? "danger" : "default"}
              onClick={() => pendingRole && apply(pendingRole)}
              disabled={loading || !pendingRole}
            >
              {loading ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
