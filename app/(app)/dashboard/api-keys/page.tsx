import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KeyRound, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { CreateApiKeyDialog } from "./create-api-key-dialog";
import { RevokeKeyButton } from "./revoke-key-button";

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/login");

  const [keys, projects] = await Promise.all([
    prisma.apiKey.findMany({
      where: { project: { organizationId: membership.organizationId } },
      include: { project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { organizationId: membership.organizationId },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Keys"
        description="Keys used by agents to authenticate with the collector"
        action={
          <CreateApiKeyDialog projects={projects}>
            <Button><Plus size={16} />Generate Key</Button>
          </CreateApiKeyDialog>
        }
      />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Prefix</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Application</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0f172a]">{key.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[#475569]">
                    <div className="flex items-center gap-1.5">
                      <KeyRound size={12} className="text-[#94a3b8]" />
                      {key.prefix}…
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{key.project.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      key.revoked
                        ? "text-[#991b1b] bg-[#fef2f2] border-[#fecaca]"
                        : "text-[#166534] bg-[#f0fdf4] border-[#bbf7d0]"
                    }`}>
                      {key.revoked ? "Revoked" : "Active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{formatDate(key.createdAt)}</td>
                  <td className="px-4 py-3">
                    {!key.revoked && <RevokeKeyButton keyId={key.id} />}
                  </td>
                </tr>
              ))}
              {keys.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[#94a3b8]">
                    No API keys yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] p-4 text-xs text-[#475569]">
        <p className="font-semibold text-[#0f172a] mb-1">Security note</p>
        API keys are shown in full only at creation time. Only the prefix and a secure hash are stored.
        Revoke compromised keys immediately — revocation takes effect within 60 seconds on the collector.
      </div>
    </div>
  );
}
