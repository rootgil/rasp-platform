"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatRelativeTime } from "@/lib/utils";
import { Radar } from "lucide-react";

type ExposureData = {
  version: string;
  totalAgents: number;
  organizations: { organizationId: string; organizationName: string; agentCount: number }[];
  agents: {
    id: string;
    version: string;
    channel: string;
    status: string;
    lastHeartbeatAt: string | null;
    project: { id: string; name: string; organization: { id: string; name: string } } | null;
  }[];
};

export function VersionExposureDialog({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ExposureData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backoffice/version-exposure?version=${encodeURIComponent(version)}`);
      if (!res.ok) throw new Error("Failed to load exposure data");
      setData(await res.json() as ExposureData);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen() {
    setOpen(true);
    if (!data) load();
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={handleOpen}>
        <Radar size={13} />
        Exposure
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Exposure - v{version}</DialogTitle>
          </DialogHeader>

          {loading && <p className="text-sm text-text-muted py-4">Loading…</p>}
          {error && <p className="text-sm text-critical py-2">{error}</p>}

          {data && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-text-muted">Total agents: </span>
                  <span className="font-semibold text-text-primary">{data.totalAgents}</span>
                </div>
                <div>
                  <span className="text-text-muted">Organizations: </span>
                  <span className="font-semibold text-text-primary">{data.organizations.length}</span>
                </div>
              </div>

              {data.organizations.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase mb-2">By organization</p>
                  <div className="flex flex-wrap gap-2">
                    {data.organizations.map((org) => (
                      <span key={org.organizationId} className="text-xs px-2.5 py-1 rounded-full border border-border bg-background text-text-primary">
                        {org.organizationName} - {org.agentCount} agent{org.agentCount !== 1 ? "s" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data.agents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-secondary uppercase mb-2">Agents ({data.agents.length})</p>
                  <div className="overflow-auto max-h-64 rounded-md border border-border">
                    <table className="w-full text-sm min-w-[420px]">
                      <thead>
                        <tr className="bg-background border-b border-border">
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Agent ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Channel</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase">Last seen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.agents.map((a) => (
                          <tr key={a.id} className="hover:bg-background">
                            <td className="px-3 py-2 font-mono text-xs text-text-muted">{a.id.slice(0, 12)}…</td>
                            <td className="px-3 py-2 text-xs">{a.project?.name ?? "-"}</td>
                            <td className="px-3 py-2 text-xs capitalize">{a.channel}</td>
                            <td className="px-3 py-2"><StatusBadge status={a.status} /></td>
                            <td className="px-3 py-2 text-xs text-text-muted">
                              {a.lastHeartbeatAt ? formatRelativeTime(new Date(a.lastHeartbeatAt)) : "Never"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {data.totalAgents === 0 && (
                <p className="text-sm text-text-muted py-2">No agents currently running this version.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
