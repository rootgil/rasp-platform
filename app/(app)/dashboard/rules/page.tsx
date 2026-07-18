import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getMembership } from "@/modules/organizations/membership.server";
import { PageHeader } from "@/components/shared/page-header";
import { getRules } from "@/modules/rules/rules.server";
import { RulesClient } from "./rules-client";

export default async function RulesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const preferred = (session.user as { organizationId?: string }).organizationId;
  const membership = await getMembership(session.user.id, preferred);
  if (!membership) redirect("/login");

  const projects = membership.organization.projects;
  const catalogueRules = await getRules();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detection Rules"
        description="Manage detection rules per application. Rules are compiled into a signed policy and pushed to your agents."
      />
      <RulesClient projects={projects} catalogueRules={catalogueRules} />
    </div>
  );
}
