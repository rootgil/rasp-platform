import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { getPlatformAuditLogs } from "@/modules/audit/audit.server";
import { VerifyAuditButton } from "./verify-audit-button";
import { AuditFilters } from "./audit-filters";
import { Lock } from "lucide-react";

export default async function PlatformAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; target?: string; actor?: string; org?: string; highlight?: string }>;
}) {
  const { action, target, actor, org, highlight } = await searchParams;

  const logs = await getPlatformAuditLogs({ action, target, actor, org });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit"
        description="All administrative actions across all organizations"
        action={<VerifyAuditButton />}
      />

      {/* Append-only enforcement banner (Addendum E.4.2) */}
      <div className="flex items-center gap-2 rounded-md border border-[#bbf7d0] bg-success-bg px-4 py-2.5 text-xs text-success-text">
        <Lock size={13} className="shrink-0" />
        <span>
          <span className="font-semibold">Append-only enforced</span> — the platform blocks any
          DELETE or UPDATE on this table at the application layer. Each record is chained via a
          SHA-256 hash. Use &ldquo;Verify integrity&rdquo; to confirm the chain is intact.
        </span>
      </div>

      <AuditFilters />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Organization</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Target</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const isHighlighted = highlight === log.id;
                  return (
                    <tr
                      key={log.id}
                      id={`row-${log.id}`}
                      className={
                        isHighlighted
                          ? "bg-critical-bg ring-1 ring-inset ring-[#fecaca]"
                          : "hover:bg-background"
                      }
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">{formatDate(log.createdAt)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-text-primary">
                        {log.actor ? (log.actor.name ?? log.actor.email) : "system"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {log.organization?.name ?? "-"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-brand">{log.action}</td>
                      <td
                        className="px-4 py-3 font-mono text-xs text-text-muted hidden md:table-cell max-w-[200px] truncate"
                        title={log.target ?? undefined}
                      >
                        {log.target ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : "-"}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                      No audit logs found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
