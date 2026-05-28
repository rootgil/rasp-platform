import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { getRulesForProject } from "@/modules/rules/rules.server";
import { RulesClient } from "./rules-client";

export default async function RulesPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session?.user?.id },
  });
  if (!membership) redirect("/login");

  const { projectId: selectedProjectId } = await searchParams;

  const projects = await prisma.project.findMany({
    where: { organizationId: membership.organizationId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Detection Rules"
          description="No applications configured yet."
        />
        <p className="text-sm text-text-muted">
          Create an application first to configure its detection rules.
        </p>
      </div>
    );
  }

  const activeProjectId = selectedProjectId ?? projects[0].id;
  const rules = await getRulesForProject(activeProjectId, membership.organizationId);

  const active = projects.find((p) => p.id === activeProjectId) ?? projects[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detection Rules"
        description="Manage which global rules are active for each application. Mode (monitor / block) is set per agent on the Agents page."
      />
      <RulesClient
        projects={projects}
        activeProjectId={active.id}
        rules={rules}
      />
    </div>
  );
}
