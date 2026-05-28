import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { KeyRound } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { RevokeKeyButton } from "./revoke-key-button";

export default async function ApiKeysPage() {
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session?.user?.id } });
  if (!membership) redirect("/login");

  const keys = await prisma.apiKey.findMany({
    where: { project: { organizationId: membership.organizationId } },
    include: { project: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Keys used by agents to authenticate with the collector"
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Prefix</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-background transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary">{key.name ?? "-"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary hidden sm:table-cell">
                    <div className="flex items-center gap-1.5">
                      <KeyRound size={12} className="text-text-muted" />
                      {key.prefix}…
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm hidden md:table-cell">{key.project.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      key.revoked
                        ? "text-critical-text bg-critical-bg border-[#fecaca]"
                        : "text-success-text bg-success-bg border-[#bbf7d0]"
                    }`}>
                      {key.revoked ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-3">
                    {!key.revoked && <RevokeKeyButton keyId={key.id} />}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-muted">
                    No API keys yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-md border border-border bg-background p-4 text-xs text-text-secondary">
        <p className="font-semibold text-text-primary mb-1">Security note</p>
        API keys are shown in full only at creation time. Only the prefix and a secure hash are stored.
        Revoke compromised keys immediately - revocation takes effect within 60 seconds on the collector.
      </div>
    </div>
  );
}
