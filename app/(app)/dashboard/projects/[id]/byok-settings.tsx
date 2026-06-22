"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KeyRound, AlertTriangle } from "lucide-react";

interface BYOKStatus {
  byokEnabled: boolean;
  masterKekConfigured: boolean;
}

export function BYOKSettings({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<BYOKStatus | null>(null);
  const [kekInput, setKekInput] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/dashboard/byok?projectId=${projectId}`);
      if (!res.ok) return;
      setStatus(await res.json() as BYOKStatus);
    } catch {
      // non-critical
    }
  }, [projectId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
  }, [fetchStatus]);

  async function setKey() {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", projectId, customerKek: kekInput }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to set BYOK key");
      }
      toast.success("BYOK key configured. Future writes will use your key.");
      setKekInput("");
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/byok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", projectId }),
      });
      if (!res.ok) throw new Error("Failed to remove BYOK key");
      toast.success("BYOK key removed. Platform master key will be used.");
      await fetchStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-5 text-sm text-text-muted">Loading…</CardContent>
      </Card>
    );
  }

  if (!status.masterKekConfigured) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardContent className="p-5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Encryption not enabled</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Set <code>KEK_MASTER_KEY</code> on the platform to enable at-rest encryption and BYOK.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound size={17} className="text-text-secondary" />
            <div>
              <CardTitle className="text-base">Bring Your Own Key (BYOK)</CardTitle>
              <CardDescription>
                Provide your own 32-byte AES-256 KEK. Your key wraps the project DEKs instead of
                the platform master key — only you can decrypt your data.
              </CardDescription>
            </div>
          </div>
          <Badge className={status.byokEnabled
            ? "bg-green-100 text-green-700 border border-green-200"
            : "bg-gray-100 text-gray-600 border border-gray-200"
          }>
            {status.byokEnabled ? "BYOK Active" : "Platform KEK"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.byokEnabled ? (
          <div className="flex items-center gap-3">
            <p className="text-sm text-text-secondary flex-1">
              Your custom KEK is active. Rotate it by supplying a new key below.
            </p>
            <Button size="sm" variant="outline" onClick={removeKey} disabled={saving}>
              {saving ? "Removing…" : "Remove BYOK Key"}
            </Button>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="byok-key">
            {status.byokEnabled ? "Replace BYOK Key" : "Set BYOK Key"} (base64, 32 bytes)
          </Label>
          <div className="flex gap-2">
            <Input
              id="byok-key"
              className="font-mono text-xs"
              value={kekInput}
              onChange={(e) => setKekInput(e.target.value)}
              placeholder="base64-encoded 32-byte AES-256 key…"
            />
            <Button onClick={setKey} disabled={saving || kekInput.length < 44} size="sm">
              {saving ? "Saving…" : "Apply Key"}
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Generate a key: <code className="bg-background border border-border rounded px-1 py-0.5">openssl rand -base64 32</code>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
