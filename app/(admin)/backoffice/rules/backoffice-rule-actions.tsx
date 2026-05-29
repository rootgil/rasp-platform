"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";

export function BackofficeRuleActions({
  ruleId,
  enabled,
}: {
  ruleId: string;
  enabled: boolean;
}) {
  const router = useRouter();

  async function patch(data: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to update rule");
      } else {
        toast.success(data.enabled ? "Règle activée globalement" : "Règle désactivée globalement");
      }
      router.refresh();
    } catch {
      toast.error("Failed to update rule");
    }
  }

  async function remove() {
    try {
      const res = await fetch(`/api/rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        toast.error(d.error ?? "Failed to delete rule");
      } else {
        toast.success("Règle supprimée");
      }
      router.refresh();
    } catch {
      toast.error("Failed to delete rule");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {enabled ? (
          <DropdownMenuItem onClick={() => patch({ enabled: false })}>
            Disable globally
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => patch({ enabled: true })}>
            Enable globally
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={remove}
          className="text-destructive focus:text-destructive"
        >
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
