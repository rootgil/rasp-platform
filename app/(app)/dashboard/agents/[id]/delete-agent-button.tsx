"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

export function DeleteAgentButton({ agentId }: { agentId: string }) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Agent deleted");
        router.push("/dashboard/agents");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to delete agent");
      }
    } catch {
      toast.error("Failed to delete agent");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-gray-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Danger Zone</p>
            <p className="text-xs text-text-muted mt-0.5">
              Permanently remove this agent. Historical security events are preserved.
            </p>
            <p className="text-xs text-amber-600 mt-1 font-medium">
              Make sure to remove the agent package from your application first.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="danger" size="sm" className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                <Trash2 size={13} className="mr-1.5" />
                Delete Agent
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
                <AlertDialogDescription>
                  The agent registration will be removed. Historical security events will be preserved but de-linked from the agent.
                  <br /><br />
                  If the agent process is still running in production it will continue sending heartbeats until you remove the package.
                  <br /><br />
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  {loading ? "Deleting…" : "Delete Agent"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
