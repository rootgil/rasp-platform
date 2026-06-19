"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export function DeleteProjectButton({
  projectId,
  projectName,
}: {
  projectId:   string;
  projectName: string;
}) {
  const router  = useRouter();
  const [open, setOpen]       = useState(false);
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (confirm !== projectName) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(`Application "${projectName}" deleted`);
        router.push("/dashboard/projects");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to delete application");
      }
    } catch {
      toast.error("Failed to delete application");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="border-gray-200">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-text-primary">Danger Zone</p>
              <p className="text-xs text-text-muted mt-0.5">
                Permanently delete this application and all associated data.
              </p>
              <p className="text-xs text-destructive mt-1 font-medium">
                This will delete all agents, API keys, events, alerts, policies and detection rules.
                This action cannot be undone.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              onClick={() => { setConfirm(""); setOpen(true); }}
            >
              <Trash2 size={13} className="mr-1.5" />
              Delete Application
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{projectName}"?</DialogTitle>
            <DialogDescription>
              All agents, API keys, security events, alerts, policies and detection rules for this application will be <strong>permanently deleted</strong>.
              <br /><br />
              This action cannot be undone. Type the application name to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label className="text-xs text-text-secondary">
              Type <span className="font-mono font-semibold text-text-primary">{projectName}</span> to confirm
            </Label>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={projectName}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={confirm !== projectName || loading}
              onClick={handleDelete}
            >
              {loading ? "Deleting…" : "Delete Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
