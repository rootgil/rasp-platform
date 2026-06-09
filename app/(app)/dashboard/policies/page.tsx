import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { PolicyFilters } from "./policy-filters";
import { PolicyRollbackButton } from "./policy-rollback-button";
import { listPolicies } from "@/modules/policies/policies.server";
import { ShieldCheck } from "lucide-react";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const filters = await searchParams;
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const orgId = membership.organizationId;

  const projects = await prisma.project.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const projectId =
    filters.projectId && projects.some((p) => p.id === filters.projectId)
      ? filters.projectId
      : undefined;

  const policies = await listPolicies(orgId, projectId);

  // Group by project to determine which version is latest per project+channel
  const latestKey = new Map<string, number>();
  for (const p of policies) {
    const key = `${p.projectId}:${p.channel}`;
    const current = latestKey.get(key) ?? -1;
    if (p.version > current) latestKey.set(key, p.version);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Signed policy versions distributed to agents"
      />

      <PolicyFilters projects={projects} />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Application</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Channel</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Agent version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Signed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {policies.map((policy) => {
                  const key = `${policy.projectId}:${policy.channel}`;
                  const isLatest = latestKey.get(key) === policy.version;
                  return (
                    <tr key={policy.id} className="hover:bg-background transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">{policy.project.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link
                          href={`/dashboard/policies/${policy.id}`}
                          className="inline-flex items-center gap-1.5 text-brand underline"
                        >
                          v{policy.version}
                          {isLatest && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-light text-brand font-medium no-underline">latest</span>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs capitalize">{policy.channel}</td>
                      <td className="px-4 py-3"><StatusBadge status={policy.mode} /></td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted hidden md:table-cell">
                        {policy.targetAgentVersion ?? "-"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {policy.signingKeyId ? (
                          <span className="inline-flex items-center gap-1 text-xs text-success">
                            <ShieldCheck size={12} />
                            {policy.signingKeyId.slice(0, 8)}…
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-muted">{formatDate(policy.createdAt)}</td>
                      <td className="px-4 py-3">
                        {!isLatest && (
                          <PolicyRollbackButton
                            projectId={policy.projectId}
                            targetVersion={policy.version}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
                {policies.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-text-muted">
                      No policies yet. Policies are created when you change enforcement mode or redaction settings.
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
