"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewVersionButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState("");
  const [channel, setChannel] = useState<"stable" | "early" | "edge">("edge");
  const [changelog, setChangelog] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/agent-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: version.trim(), channel, changelog: changelog.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors de la création");
      }
      setOpen(false);
      setVersion("");
      setChannel("edge");
      setChangelog("");
      toast.success(`Version ${version.trim()} créée`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        New Version
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Agent Version</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Version</label>
              <Input
                placeholder="e.g. 1.4.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Channel</label>
              <Select value={channel} onValueChange={(v) => setChannel(v as "stable" | "early" | "edge")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edge">Edge</SelectItem>
                  <SelectItem value="early">Early</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary">Changelog</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-[#cbd5e1] bg-white px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none disabled:opacity-50 resize-none"
                placeholder="What changed in this version?"
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                rows={3}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !version.trim()}>
                {loading ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
