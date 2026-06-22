"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ShieldOff,
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  Smartphone,
  Zap,
  Copy,
  Check,
  Hourglass,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ApprovalStatus = "pending" | "approved" | "rejected" | "executed";

interface ApprovalRequest {
  id: string;
  action: string;
  target: string | null;
  reason: string | null;
  status: ApprovalStatus;
  createdAt: string;
  requestedBy: { id: string; email: string };
  approvedBy: { id: string; email: string } | null;
}

// ─── Kill-Switch Section ──────────────────────────────────────────────────────

function KillSwitchSection({ currentUserId }: { currentUserId?: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  // Raise-approval dialog state
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseReason, setRaiseReason] = useState("");
  const [raising, setRaising] = useState(false);

  // Activate dialog state
  const [activateOpen, setActivateOpen] = useState(false);
  const [activateMfa, setActivateMfa] = useState("");
  const [activating, setActivating] = useState(false);

  // Disable dialog state
  const [disableOpen, setDisableOpen] = useState(false);
  const [disableMfaToken, setDisableMfaToken] = useState("");
  const [disabling, setDisabling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/backoffice/kill-switch");
      if (!res.ok) return;
      const data = (await res.json()) as { setting: { killSwitchEnabled: boolean } };
      setEnabled(data.setting.killSwitchEnabled);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
  }, [fetchStatus]);

  async function raiseApproval() {
    setRaising(true);
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "platform.kill_switch", reason: raiseReason }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to raise approval");
      }
      toast.success("Approval request raised. A second admin must approve it before you can activate.");
      setRaiseOpen(false);
      setRaiseReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setRaising(false);
    }
  }

  async function activateKillSwitch() {
    setActivating(true);
    try {
      const res = await fetch("/api/backoffice/kill-switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mfa-token": activateMfa,
        },
        body: JSON.stringify({ enabled: true }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to activate kill-switch");
      }
      toast.success("Platform kill-switch ACTIVATED. All agents will stop inspecting requests.");
      setEnabled(true);
      setActivateOpen(false);
      setActivateMfa("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setActivating(false);
    }
  }

  async function deactivateKillSwitch() {
    setDisabling(true);
    try {
      const res = await fetch("/api/backoffice/kill-switch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-mfa-token": disableMfaToken,
        },
        body: JSON.stringify({ enabled: false }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed to disable kill-switch");
      }
      toast.success("Kill-switch disabled. Agents are back online.");
      setEnabled(false);
      setDisableOpen(false);
      setDisableMfaToken("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setDisabling(false);
    }
  }

  return (
    <>
      <Card className={enabled ? "border-red-400 bg-red-50 dark:bg-red-950/20" : ""}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {enabled ? (
                <ShieldOff className="text-red-500" size={22} />
              ) : (
                <Shield className="text-green-600" size={22} />
              )}
              <div>
                <CardTitle>Global Kill-Switch</CardTitle>
                <CardDescription>
                  Immediately stops all agent inspection across every tenant.
                  Requires dual-authorization + MFA.
                </CardDescription>
              </div>
            </div>
            {!loading && (
              <Badge
                variant={enabled ? "destructive" : "default"}
                className={!enabled ? "bg-green-100 text-green-700 border border-green-200" : ""}
              >
                {enabled ? "ACTIVE" : "Inactive"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" onClick={() => setRaiseOpen(true)}>
            Raise approval request
          </Button>
          {!enabled && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setActivateOpen(true)}
              disabled={loading}
            >
              <AlertTriangle size={15} className="mr-1.5" />
              Activate kill-switch
            </Button>
          )}
          {enabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisableOpen(true)}
              disabled={loading}
            >
              <Shield size={15} className="mr-1.5" />
              Restore agents
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Raise approval dialog */}
      <Dialog open={raiseOpen} onOpenChange={setRaiseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise Kill-Switch Approval</DialogTitle>
            <DialogDescription>
              This creates a dual-authorization request. A <strong>different</strong> admin must
              approve it before the kill-switch can be activated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="ks-reason">Reason (incident description)</Label>
            <Textarea
              id="ks-reason"
              value={raiseReason}
              onChange={(e) => setRaiseReason(e.target.value)}
              placeholder="Describe the security incident..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRaiseOpen(false)}>
              Cancel
            </Button>
            <Button onClick={raiseApproval} disabled={raising || !raiseReason.trim()}>
              {raising ? "Raising…" : "Raise Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate kill-switch dialog */}
      <Dialog open={activateOpen} onOpenChange={setActivateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle size={18} />
              Activate Platform Kill-Switch
            </DialogTitle>
            <DialogDescription>
              This will immediately disable all RASP agents across every tenant.
              An approved dual-authorization request must exist. Enter your MFA code to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="ks-mfa">MFA Code</Label>
            <Input
              id="ks-mfa"
              value={activateMfa}
              onChange={(e) => setActivateMfa(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              pattern="\d{6}"
              inputMode="numeric"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={activateKillSwitch}
              disabled={activating || activateMfa.length !== 6}
            >
              {activating ? "Activating…" : "Confirm Activation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable kill-switch dialog */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Agents</DialogTitle>
            <DialogDescription>
              Re-enable inspection on all agents. Enter your MFA code to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="disable-mfa">MFA Code</Label>
            <Input
              id="disable-mfa"
              value={disableMfaToken}
              onChange={(e) => setDisableMfaToken(e.target.value)}
              placeholder="6-digit code"
              maxLength={6}
              inputMode="numeric"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={deactivateKillSwitch}
              disabled={disabling || disableMfaToken.length !== 6}
            >
              {disabling ? "Restoring…" : "Restore Agents"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  void currentUserId;
}

// ─── Approvals Queue ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
  executed: { label: "Executed", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

function ApprovalsTable({
  rows,
  currentEmail,
  onRespond,
  emptyLabel,
}: {
  rows: ApprovalRequest[];
  currentEmail: string | null | undefined;
  onRespond: (id: string, action: "approve" | "reject") => Promise<void>;
  emptyLabel: string;
}) {
  const actionLabel: Record<string, string> = {
    "platform.kill_switch":    "Platform Kill-Switch",
    "agent_version.rollback":  "Agent Version Rollback",
    "agent_version.quarantine":"Agent Version Quarantine",
    "tenant.crypto_shred":     "Tenant Crypto-Shred",
  };

  if (rows.length === 0) {
    return (
      <div className="px-5 py-6 text-center text-sm text-text-muted">{emptyLabel}</div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-background border-b border-border">
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Action</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Raised by</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Reason</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">When</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-text-secondary uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((req) => {
            const isOwn = req.requestedBy.email === currentEmail;
            const badge = STATUS_BADGE[req.status];
            return (
              <tr key={req.id} className="hover:bg-background/60">
                <td className="px-4 py-3 font-medium">
                  {actionLabel[req.action] ?? req.action}
                  {req.target && (
                    <span className="ml-1.5 text-xs text-text-muted font-mono">
                      ({req.target.slice(0, 8)}…)
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-text-secondary">
                  {req.requestedBy.email}
                  {isOwn && <span className="ml-1.5 text-[10px] text-brand font-semibold">(you)</span>}
                </td>
                <td className="px-4 py-3 text-text-secondary max-w-[180px] truncate">
                  {req.reason ?? <em className="text-text-muted">—</em>}
                </td>
                <td className="px-4 py-3 text-text-muted text-xs">
                  {new Date(req.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${badge?.className ?? ""}`}>
                    {req.status === "approved" && req.approvedBy && (
                      <span className="opacity-70">by {req.approvedBy.email.split("@")[0]}</span>
                    )}
                    {req.status === "rejected" && req.approvedBy && (
                      <span className="opacity-70">by {req.approvedBy.email.split("@")[0]}</span>
                    )}
                    {badge?.label ?? req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {req.status === "pending" && (
                    <div className="flex items-center justify-end gap-2">
                      {isOwn ? (
                        <span className="flex items-center gap-1.5 text-xs text-text-muted italic">
                          <Hourglass size={12} />
                          Waiting for another admin
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => onRespond(req.id, "approve")}
                        >
                          <CheckCircle2 size={13} className="mr-1" />
                          Approve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => onRespond(req.id, "reject")}
                      >
                        <XCircle size={13} className="mr-1" />
                        {isOwn ? "Cancel" : "Reject"}
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalsSection() {
  const { data: session } = useSession();
  const currentEmail = session?.user?.email;

  const [allRequests, setAllRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading]         = useState(true);

  const fetchApprovals = useCallback(async () => {
    try {
      // Fetch all non-executed requests so the requester can track their own status
      const res = await fetch("/api/admin/approvals");
      if (!res.ok) return;
      const data = (await res.json()) as { requests: ApprovalRequest[] };
      setAllRequests(data.requests.filter((r) => r.status !== "executed"));
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 30_000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  async function respond(id: string, action: "approve" | "reject") {
    try {
      const res = await fetch(`/api/admin/approvals/${id}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      toast.success(`Request ${action}d.`);
      await fetchApprovals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  const pending   = allRequests.filter((r) => r.status === "pending");
  const resolved  = allRequests.filter((r) => r.status === "approved" || r.status === "rejected");
  const myPending = pending.filter((r) => r.requestedBy.email === currentEmail);
  const others    = pending.filter((r) => r.requestedBy.email !== currentEmail);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock size={18} />
          Dual-Authorization Queue
        </CardTitle>
        <CardDescription>
          You cannot approve requests that you raised. A different admin must review them.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 divide-y divide-border">
        {loading ? (
          <div className="px-5 py-4 text-sm text-text-muted">Loading…</div>
        ) : (
          <>
            {/* Requests awaiting another admin's action */}
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Action required ({others.length})
              </p>
              <ApprovalsTable
                rows={others}
                currentEmail={currentEmail}
                onRespond={respond}
                emptyLabel="No requests waiting for your approval"
              />
            </div>

            {/* Requests raised by the current admin (pending) */}
            {myPending.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  My pending requests ({myPending.length})
                </p>
                <ApprovalsTable
                  rows={myPending}
                  currentEmail={currentEmail}
                  onRespond={respond}
                  emptyLabel=""
                />
              </div>
            )}

            {/* Recently resolved */}
            {resolved.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                  Recently resolved ({resolved.length})
                </p>
                <ApprovalsTable
                  rows={resolved}
                  currentEmail={currentEmail}
                  onRespond={respond}
                  emptyLabel=""
                />
              </div>
            )}

            {allRequests.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-text-muted">
                No pending or recent approvals
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── MFA Setup Section ────────────────────────────────────────────────────────

function MfaSection() {
  const [mfaEnabled, setMfaEnabled] = useState<boolean | null>(null);

  // Enrollment state
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [enrollStep, setEnrollStep] = useState<"idle" | "qr" | "confirming">("idle");

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mfa");
      if (!res.ok) return;
      const d = (await res.json()) as { mfaEnabled: boolean };
      setMfaEnabled(d.mfaEnabled);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
  }, [fetchStatus]);

  async function startEnroll() {
    setEnrollStep("qr");
    try {
      const res = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enroll" }),
      });
      if (!res.ok) throw new Error("Failed to start enrollment");
      const d = (await res.json()) as { otpauthUrl: string; secret: string };
      setOtpauthUrl(d.otpauthUrl);
      setSecret(d.secret);
      setEnrollOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setEnrollStep("idle");
    }
  }

  async function confirmEnroll() {
    setEnrollStep("confirming");
    try {
      const res = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", token: confirmCode }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Invalid code");
      }
      toast.success("MFA enabled successfully.");
      setMfaEnabled(true);
      setEnrollOpen(false);
      setEnrollStep("idle");
      setConfirmCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
      setEnrollStep("qr");
    }
  }

  async function disableMfa() {
    try {
      const res = await fetch("/api/admin/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable" }),
      });
      if (!res.ok) throw new Error("Failed to disable MFA");
      toast.success("MFA disabled.");
      setMfaEnabled(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone size={20} className="text-text-secondary" />
              <div>
                <CardTitle>Admin MFA (TOTP)</CardTitle>
                <CardDescription>
                  Required before executing sensitive actions (kill-switch, rollback, quarantine).
                </CardDescription>
              </div>
            </div>
            {mfaEnabled !== null && (
              <Badge
                className={
                  mfaEnabled
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-amber-100 text-amber-700 border border-amber-200"
                }
              >
                {mfaEnabled ? "Enabled" : "Not configured"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mfaEnabled === false && (
            <Button size="sm" onClick={startEnroll} disabled={enrollStep === "qr"}>
              {enrollStep === "qr" ? "Loading…" : "Set up authenticator app"}
            </Button>
          )}
          {mfaEnabled === true && (
            <Button size="sm" variant="outline" onClick={disableMfa}>
              Disable MFA
            </Button>
          )}
        </CardContent>
      </Card>

      {/* TOTP enrollment dialog */}
      <Dialog open={enrollOpen} onOpenChange={(o) => { setEnrollOpen(o); if (!o) setEnrollStep("idle"); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set up Authenticator App</DialogTitle>
            <DialogDescription>
              Scan the link in your authenticator app (Google Authenticator, Authy, etc.) or
              enter the secret manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">
                1. Open your authenticator app and add a new TOTP account.
              </p>
              <a
                href={otpauthUrl}
                className="block w-full text-xs font-mono bg-background border border-border rounded-md px-3 py-2 break-all text-brand hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {otpauthUrl}
              </a>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">Manual key:</p>
              <code className="block w-full text-sm font-mono bg-background border border-border rounded-md px-3 py-2 tracking-widest select-all">
                {secret}
              </code>
            </div>
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1.5">
                2. Enter the 6-digit code your app shows to confirm.
              </p>
              <Input
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
                pattern="\d{6}"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEnrollOpen(false); setEnrollStep("idle"); }}>
              Cancel
            </Button>
            <Button
              onClick={confirmEnroll}
              disabled={enrollStep === "confirming" || confirmCode.length !== 6}
            >
              {enrollStep === "confirming" ? "Verifying…" : "Activate MFA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Break-Glass Section ──────────────────────────────────────────────────────

function BreakGlassSection() {
  const [reason, setReason] = useState("");
  const [creating, setCreating] = useState(false);
  const [rawToken, setRawToken] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [tokenExpiry, setTokenExpiry] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTokens, setActiveTokens] = useState<{ id: string; reason: string | null; expiresAt: string; createdBy: { email: string } }[]>([]);

  const fetchTokens = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/break-glass");
      if (!res.ok) return;
      const d = (await res.json()) as { tokens: typeof activeTokens };
      setActiveTokens(d.tokens);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTokens();
  }, [fetchTokens]);

  async function createToken() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/break-glass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", reason }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      const d = (await res.json()) as { id: string; rawToken: string; expiresAt: string };
      setRawToken(d.rawToken);
      setTokenId(d.id);
      setTokenExpiry(d.expiresAt);
      setReason("");
      await fetchTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setCreating(false);
    }
  }

  async function revokeToken(id: string) {
    try {
      const res = await fetch("/api/admin/break-glass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", tokenId: id }),
      });
      if (!res.ok) throw new Error("Failed to revoke");
      toast.success("Token revoked.");
      if (id === tokenId) setRawToken("");
      await fetchTokens();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-amber-500" />
          <div>
            <CardTitle>Break-Glass Emergency Access</CardTitle>
            <CardDescription>
              Generate a single-use, 4-hour token for out-of-band recovery when normal auth is
              unavailable. Every issuance is permanently audit-logged.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rawToken && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 space-y-2">
            <p className="text-sm font-semibold text-amber-800">
              Emergency token generated — copy it now. It will not be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-white border border-amber-200 px-3 py-2 font-mono text-xs break-all">
                {rawToken}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded p-2 hover:bg-amber-100 transition-colors"
              >
                {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} className="text-amber-700" />}
              </button>
            </div>
            <p className="text-xs text-amber-700">
              Expires: {new Date(tokenExpiry).toLocaleString()} · ID: {tokenId.slice(0, 12)}…
            </p>
          </div>
        )}

        {activeTokens.length > 0 && (
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">Active Tokens</p>
            <div className="space-y-2">
              {activeTokens.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-text-muted">{t.id.slice(0, 10)}…</span>
                    <span className="mx-2 text-border">·</span>
                    <span className="text-text-secondary">{t.reason ?? "—"}</span>
                    <span className="mx-2 text-border">·</span>
                    <span className="text-xs text-text-muted">expires {new Date(t.expiresAt).toLocaleString()}</span>
                  </div>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => revokeToken(t.id)}>
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Incident reason (min 10 chars)…"
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={createToken}
            disabled={creating || reason.length < 10}
          >
            {creating ? "Generating…" : "Generate Token"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SecurityCenterPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Center"
        description="Kill-switch, dual-authorization approvals, admin MFA, and break-glass"
      />
      <KillSwitchSection />
      <ApprovalsSection />
      <BreakGlassSection />
      <MfaSection />
    </div>
  );
}
