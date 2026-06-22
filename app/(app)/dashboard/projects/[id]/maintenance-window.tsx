"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface MaintenanceWindow {
  startHour: number;
  endHour: number;
  days?: number[];
}

interface AgentInfo {
  id: string;
  version: string;
  status: string;
  maintenanceWindow: MaintenanceWindow | null;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function AgentMaintenanceRow({ agent }: { agent: AgentInfo }) {
  const [window, setWindow] = useState<MaintenanceWindow | null>(agent.maintenanceWindow);
  const [editing, setEditing] = useState(false);
  const [startHour, setStartHour] = useState(window?.startHour ?? 2);
  const [endHour, setEndHour] = useState(window?.endHour ?? 4);
  const [days, setDays] = useState<number[]>(window?.days ?? []);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function save() {
    if (endHour <= startHour) {
      toast.error("End hour must be after start hour.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set",
          window: { startHour, endHour, days: days.length > 0 ? days : undefined },
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      const d = (await res.json()) as { maintenanceWindow: MaintenanceWindow };
      setWindow(d.maintenanceWindow);
      toast.success("Maintenance window saved.");
      setEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function clear() {
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agent.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      if (!res.ok) throw new Error("Failed to clear window");
      setWindow(null);
      setEditing(false);
      toast.success("Maintenance window removed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary font-mono">{agent.id.slice(0, 16)}…</p>
          <p className="text-xs text-text-muted">v{agent.version} · {agent.status}</p>
        </div>
        <div className="flex items-center gap-2">
          {window ? (
            <Badge className="bg-blue-100 text-blue-700 border border-blue-200 text-xs">
              {String(window.startHour).padStart(2, "0")}:00–{String(window.endHour).padStart(2, "0")}:00 UTC
              {window.days && window.days.length > 0
                ? ` · ${window.days.map((d) => DAY_NAMES[d]).join(", ")}`
                : " · Daily"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">Any time</Badge>
          )}
          <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>
            {editing ? "Cancel" : window ? "Edit" : "Set Window"}
          </Button>
        </div>
      </div>

      {editing && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div className="flex gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Start hour (UTC)</Label>
              <input
                type="number"
                min={0}
                max={23}
                value={startHour}
                onChange={(e) => setStartHour(Number(e.target.value))}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End hour (UTC)</Label>
              <input
                type="number"
                min={1}
                max={24}
                value={endHour}
                onChange={(e) => setEndHour(Number(e.target.value))}
                className="w-20 rounded-md border border-border bg-background px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Days (empty = every day)</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAY_NAMES.map((name, i) => (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    days.includes(i)
                      ? "bg-brand text-white border-brand"
                      : "bg-background border-border text-text-secondary hover:bg-border-light"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            {window && (
              <Button size="sm" variant="outline" onClick={clear} disabled={saving}
                className="text-red-600 border-red-200">
                Clear
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MaintenanceWindowSettings({ projectId }: { projectId: string }) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/agents`);
      if (!res.ok) return;
      const d = (await res.json()) as { agents: AgentInfo[] };
      setAgents(d.agents);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAgents();
  }, [fetchAgents]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock size={17} className="text-text-secondary" />
          <div>
            <CardTitle className="text-base">Agent Maintenance Windows</CardTitle>
            <CardDescription>
              Constrain when upgrade advertisements are sent to each agent (UTC hours).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <p className="text-sm text-text-muted">Loading agents…</p>}
        {!loading && agents.length === 0 && (
          <p className="text-sm text-text-muted">No agents registered for this project.</p>
        )}
        {agents.map((a) => (
          <AgentMaintenanceRow key={a.id} agent={a} />
        ))}
      </CardContent>
    </Card>
  );
}
