import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Boxes, Server, ShieldAlert } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import Link from "next/link";
import { CreateProjectDialog } from "./create-project-dialog";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) redirect("/login");

  const projects = await prisma.project.findMany({
    where: { organizationId: membership.organizationId },
    include: {
      _count: { select: { agents: true, securityEvents: true, alerts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Applications"
        description="Protected applications and their agents"
        action={
          <CreateProjectDialog>
            <Button>
              <Plus size={16} />
              Add Application
            </Button>
          </CreateProjectDialog>
        }
      />

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-full bg-[#f1f5f9] flex items-center justify-center mb-4">
              <Boxes size={24} className="text-[#94a3b8]" />
            </div>
            <p className="text-sm font-semibold text-[#0f172a]">No applications yet</p>
            <p className="mt-1 text-sm text-[#94a3b8]">Add an application to start protecting it</p>
            <CreateProjectDialog>
              <Button className="mt-4">
                <Plus size={16} />
                Add Application
              </Button>
            </CreateProjectDialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <Card className="hover:border-[#2563eb] transition-colors cursor-pointer h-full">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#eff6ff]">
                      <Boxes size={18} className="text-[#2563eb]" />
                    </div>
                    <StatusBadge status={project.environment} />
                  </div>
                  <h3 className="font-semibold text-[#0f172a] font-mono">{project.name}</h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    {project.language} {project.framework ? `· ${project.framework}` : ""}
                  </p>

                  <div className="mt-4 flex items-center gap-4 text-xs text-[#475569]">
                    <span className="flex items-center gap-1">
                      <Server size={12} className="text-[#94a3b8]" />
                      {project._count.agents} agents
                    </span>
                    <span className="flex items-center gap-1">
                      <ShieldAlert size={12} className="text-[#94a3b8]" />
                      {project._count.securityEvents} events
                    </span>
                    {project._count.alerts > 0 && (
                      <span className="flex items-center gap-1 text-[#dc2626]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
                        {project._count.alerts} alerts
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-[#94a3b8]">
                    Created {formatRelativeTime(project.createdAt)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
