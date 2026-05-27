"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { formatDate } from "@/lib/utils";
import { Copy, Check, UserPlus } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  status: string;
  convertedAt: Date | null;
  createdAt: Date;
};

type ProvisionResult = {
  userId: string;
  orgId: string;
  tempPassword: string;
};

export function ContactLeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: "", email: "", orgName: "", plan: "free" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const [copied, setCopied] = useState(false);

  function openDialog(lead: Lead) {
    setSelectedLead(lead);
    setForm({
      name: lead.name,
      email: lead.email,
      orgName: lead.company ?? "",
      plan: "free",
    });
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function closeDialog() {
    setSelectedLead(null);
    setResult(null);
    setError(null);
    if (result) router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backoffice/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, leadId: selectedLead?.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setResult(data);
      router.refresh();
    } catch {
      setError("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    if (!result) return;
    navigator.clipboard.writeText(result.tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                      No contact leads yet.
                    </td>
                  </tr>
                )}
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-background">
                    <td className="px-4 py-3 font-medium text-text-primary">{lead.name}</td>
                    <td className="px-4 py-3 text-text-secondary">{lead.email}</td>
                    <td className="px-4 py-3 text-text-secondary hidden sm:table-cell">{lead.company ?? "-"}</td>
                    <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                          lead.status === "converted"
                            ? "text-success-text bg-success-bg border-[#bbf7d0]"
                            : "text-medium-text bg-medium-bg border-[#fde68a]"
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lead.status === "pending" && (
                        <button
                          onClick={() => openDialog(lead)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
                        >
                          <UserPlus size={13} />
                          Create Account
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedLead} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-md">
          {!result ? (
            <>
              <DialogHeader>
                <DialogTitle>Create Account</DialogTitle>
                <DialogDescription>
                  Provision an organization and user account. A temporary password will be generated.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Full name</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Jane Doe"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Email</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="jane@company.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Organization name</label>
                  <Input
                    value={form.orgName}
                    onChange={(e) => setForm((f) => ({ ...f, orgName: e.target.value }))}
                    placeholder="Acme Corp"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Plan</label>
                  <Select
                    value={form.plan}
                    onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {error}
                  </p>
                )}
                <DialogFooter className="pt-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="h-9 px-4 text-sm rounded-md border border-border text-text-secondary hover:bg-background transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-9 px-4 text-sm rounded-md bg-brand text-white hover:bg-brand-hover transition-colors disabled:opacity-60"
                  >
                    {loading ? "Creating…" : "Create Account"}
                  </button>
                </DialogFooter>
              </form>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Account Created</DialogTitle>
                <DialogDescription>
                  Share these credentials with the user. The password is shown only once.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="rounded-md border border-border bg-background p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Email</span>
                    <span className="font-medium text-text-primary">{form.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">Temp password</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono font-semibold text-text-primary">
                        {result.tempPassword}
                      </code>
                      <button
                        onClick={copyPassword}
                        className="text-text-muted hover:text-brand transition-colors"
                        title="Copy password"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-muted">
                  Ask the user to change their password after first login.
                </p>
              </div>
              <DialogFooter className="pt-2">
                <button
                  onClick={closeDialog}
                  className="h-9 px-4 text-sm rounded-md bg-brand text-white hover:bg-brand-hover transition-colors"
                >
                  Done
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
