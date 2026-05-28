import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { getRules } from "@/modules/rules/rules.server";
import { RulesClient } from "./rules-client";

export default async function RulesPage() {
  const session = await auth();
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session?.user?.id },
  });
  if (!membership) redirect("/login");

  const rules = await getRules();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Detection Rules"
        description="Active detection rules enforced by the RASP agent. Rules are managed by the platform administrator."
      />
      <RulesClient rules={rules} />
    </div>
  );
}
