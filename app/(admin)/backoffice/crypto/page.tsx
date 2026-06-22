"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { KeyRound, RotateCcw, Trash2, ShieldOff } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface TenantKeyRow {
  id: string;
  version: number;
  active: boolean;
  destroyed: boolean;
  createdAt: string;
  rotatedAt: string | null;
}

function ProjectDekPanel({ project }: { project: Project }) {
  const [keys, setKeys] = useState<TenantKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rotateOpen, setRotateOpen] = useState(false);
  const [shredOpen, setShredOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/backoffice/dek?projectId=${project.id}`);
      if (!res.ok) return;
      const d = (await res.json()) as { keys: TenantKeyRow[] };
      setKeys(d.keys);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  async function callDek(action: "rotate" | "shred") {
    setActing(true);
    try {
      const res = await fetch("/api/backoffice/dek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, projectId: project.id }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      toast.success(action === "rotate" ? "DEK rotated - new version created." : "Crypto-shred complete. All tenant data is permanently unrecoverable.");
      setRotateOpen(false);
      setShredOpen(false);
      await fetchKeys();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActing(false);
    }
  }

  const activeKey = keys.find((k) => k.active && !k.destroyed);
  const isShredded = keys.length > 0 && keys.every((k) => k.destroyed);

  return (
    <>
      <Card className={isShredded ? "border-red-300 bg-red-50 dark:bg-red-950/20" : ""}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <KeyRound size={18} className={isShredded ? "text-red-500" : "text-text-secondary"} />
              <div>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <CardDescription>
                  {isShredded
                    ? "Crypto-shredded - all payload data is permanently unrecoverable"
                    : activeKey
                    ? `Active DEK v${activeKey.version} · ${keys.length} key version${keys.length !== 1 ? "s" : ""} total`
                    : "No DEK yet - created on first write"}
                </CardDescription>
              </div>
            </div>
            {isShredded && (
              <Badge className="bg-red-100 text-red-700 border border-red-200 shrink-0">
                <ShieldOff size={11} className="mr-1" />
                Shredded
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isShredded && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setRotateOpen(true)}>
                <RotateCcw size={13} className="mr-1.5" />
                Rotate DEK
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShredOpen(true)}
              >
                <Trash2 size={13} className="mr-1.5" />
                Crypto-shred
              </Button>
            </div>
          )}

          {keys.length > 0 && (
            <div className="-mx-5 overflow-x-auto border-t border-border">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Version</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-secondary uppercase">Rotated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm text-text-muted">Loading…</td>
                    </tr>
                  ) : (
                    keys.map((k) => (
                      <tr key={k.id} className="hover:bg-background/60">
                        <td className="px-4 py-2 font-mono text-xs">v{k.version}</td>
                        <td className="px-4 py-2">
                          {k.destroyed ? (
                            <Badge className="bg-red-100 text-red-700 border border-red-200 text-[10px]">Destroyed</Badge>
                          ) : k.active ? (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-text-muted">{new Date(k.createdAt).toLocaleString()}</td>
                        <td className="px-4 py-2 text-xs text-text-muted">
                          {k.rotatedAt ? new Date(k.rotatedAt).toLocaleString() : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rotate dialog */}
      <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={16} />
              Rotate DEK - {project.name}
            </DialogTitle>
            <DialogDescription>
              A new Data Encryption Key will be created. Subsequent writes will use the new key.
              Existing encrypted payloads remain readable via the old key until re-encrypted.
              This is a non-destructive operation.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRotateOpen(false)}>Cancel</Button>
            <Button onClick={() => callDek("rotate")} disabled={acting}>
              {acting ? "Rotating…" : "Confirm Rotation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shred dialog */}
      <Dialog open={shredOpen} onOpenChange={setShredOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 size={16} />
              Crypto-shred - {project.name}
            </DialogTitle>
            <DialogDescription>
              <strong>This is permanent and irreversible.</strong> All DEKs for this project will
              be destroyed, making every encrypted payload permanently unrecoverable. Use only for
              GDPR Right-to-Erasure or tenant offboarding.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShredOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => callDek("shred")} disabled={acting}>
              {acting ? "Shredding…" : "Permanently Destroy Keys"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CryptoPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backoffice/projects")
      .then((r) => r.json())
      .then((d: { projects?: Project[] }) => setProjects(d.projects ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cryptographic Key Management"
        description="DEK rotation and crypto-shred per tenant project"
      />

      {loading && (
        <p className="text-sm text-text-muted">Loading projects…</p>
      )}

      {!loading && projects.length === 0 && (
        <p className="text-sm text-text-muted">No projects found.</p>
      )}

      <div className="space-y-4">
        {projects.map((p) => (
          <ProjectDekPanel key={p.id} project={p} />
        ))}
      </div>
    </div>
  );
}
