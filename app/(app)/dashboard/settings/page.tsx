import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();

  const [membership, user] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId: session?.user?.id },
      include: {
        organization: true,
        user: { select: { name: true, email: true, role: true, createdAt: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: session?.user?.id } }),
  ]);

  if (!membership) redirect("/login");

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: membership.organizationId },
    include: { user: { select: { name: true, email: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Organization and account settings" />

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Organization</CardTitle></CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {[
                { label: "Name", value: membership.organization.name },
                { label: "Plan", value: membership.organization.plan.toUpperCase() },
                { label: "Created", value: membership.organization.createdAt.toLocaleDateString("en-CA") },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-text-secondary">{label}</dt>
                  <dd className="text-sm font-medium text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-border">
              {[
                { label: "Name", value: user?.name ?? "-" },
                { label: "Email", value: user?.email ?? "-" },
                { label: "Role", value: membership.role },
                { label: "Member since", value: user?.createdAt.toLocaleDateString("en-CA") ?? "-" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-text-secondary">{label}</dt>
                  <dd className="text-sm font-medium text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead>
                <tr className="bg-background border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-text-secondary uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-background">
                    <td className="px-5 py-3 font-medium text-text-primary">{m.user.name ?? "-"}</td>
                    <td className="px-5 py-3 text-text-secondary">{m.user.email}</td>
                    <td className="px-5 py-3 capitalize text-xs font-medium text-text-secondary">{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
