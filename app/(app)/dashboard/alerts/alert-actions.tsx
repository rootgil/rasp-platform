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

export function AlertActions({
  alertId,
  currentStatus,
}: {
  alertId: string;
  currentStatus: string;
}) {
  const router = useRouter();

  const STATUS_LABELS: Record<string, string> = {
    open: "open",
    investigating: "investigating",
    resolved: "resolved",
  };

  async function updateStatus(status: string) {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        toast.error(data.error ?? "Failed to update alert");
      } else {
        toast.success(`Alerte marquée comme ${STATUS_LABELS[status] ?? status}`);
      }
      router.refresh();
    } catch {
      toast.error("Failed to update alert");
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
        {currentStatus !== "open" && (
          <DropdownMenuItem onClick={() => updateStatus("open")}>
            Mark as open
          </DropdownMenuItem>
        )}
        {currentStatus !== "investigating" && (
          <DropdownMenuItem onClick={() => updateStatus("investigating")}>
            Mark as investigating
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {currentStatus !== "resolved" && (
          <DropdownMenuItem
            onClick={() => updateStatus("resolved")}
            className="text-success focus:text-success"
          >
            Mark as resolved
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
