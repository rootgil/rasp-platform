import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PromoteVersionButton } from "./promote-version-button";

export default async function AgentVersionsPage() {
  const versions = await prisma.agentVersion.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Versions"
        description="Manage RASP agent release channels and promotions"
        action={<Button><Plus size={16} />New Version</Button>}
      />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Changelog</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Released</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-mono font-bold text-text-primary">{v.version}</td>
                  <td className="px-4 py-3 text-xs capitalize">{v.channel}</td>
                  <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-4 py-3 text-xs text-text-secondary hidden md:table-cell max-w-xs truncate">{v.changelog ?? "-"}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {v.releasedAt ? formatDate(v.releasedAt) : "Not released"}
                  </td>
                  <td className="px-4 py-3">
                    {v.status === "candidate" && (
                      <PromoteVersionButton versionId={v.id} version={v.version} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
