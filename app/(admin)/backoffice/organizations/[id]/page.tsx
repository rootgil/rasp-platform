import { notFound } from "next/navigation";
import { getOrganization } from "@/modules/organizations/organizations.server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgDetailPage({ params }: Props) {
  const { id } = await params;

  const org = await getOrganization(id);
  if (!org) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <PageHeader
            title={org.name}
            description={`Created ${formatDate(org.createdAt)}`}
          />
        </div>
        <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase border border-border text-text-secondary bg-background">
          {org.plan}
        </span>
      </div>

      {/* Members */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Members <span className="text-text-muted font-normal">({org.members.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[300px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {org.members.map((m) => (
                  <tr key={m.id} className="hover:bg-background">
                    <td className="px-4 py-3 font-medium text-text-primary">{m.user.name ?? "-"}</td>
                    <td className="px-4 py-3 text-text-secondary">{m.user.email}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-border text-text-secondary bg-background">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-muted hidden md:table-cell">{formatDate(m.createdAt)}</td>
                  </tr>
                ))}
                {org.members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-sm text-text-muted">No members</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-semibold">
            Projects <span className="text-text-muted font-normal">({org.projects.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 mt-3">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[300px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Language</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden sm:table-cell">Framework</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Environment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden md:table-cell">Agents</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase hidden lg:table-cell">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {org.projects.map((p) => (
                  <tr key={p.id} className="hover:bg-background">
                    <td className="px-4 py-3 font-medium text-brand">
                      <Link href={`/backoffice/projects/${p.id}`} className="hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary hidden sm:table-cell">{p.language}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary hidden sm:table-cell">{p.framework ?? "-"}</td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">
                      <span className="px-2 py-0.5 rounded-full border border-border text-text-secondary bg-background font-medium">
                        {p.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">{p._count.agents}</td>
                    <td className="px-4 py-3 text-xs text-text-muted hidden lg:table-cell">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
                {org.projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-text-muted">No projects</td>
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
