import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [membership, user] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true,
        user: { select: { name: true, email: true, role: true, createdAt: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
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
            <dl className="divide-y divide-[#e2e8f0]">
              {[
                { label: "Name", value: membership.organization.name },
                { label: "Plan", value: membership.organization.plan.toUpperCase() },
                { label: "Created", value: membership.organization.createdAt.toLocaleDateString("en-CA") },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-[#475569]">{label}</dt>
                  <dd className="text-sm font-medium text-[#0f172a]">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Profile</CardTitle></CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y divide-[#e2e8f0]">
              {[
                { label: "Name", value: user?.name ?? "—" },
                { label: "Email", value: user?.email ?? "—" },
                { label: "Role", value: membership.role },
                { label: "Member since", value: user?.createdAt.toLocaleDateString("en-CA") ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3">
                  <dt className="text-sm text-[#475569]">{label}</dt>
                  <dd className="text-sm font-medium text-[#0f172a]">{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Team Members</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#475569] uppercase">Name</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#475569] uppercase">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-[#475569] uppercase">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-[#f8fafc]">
                    <td className="px-5 py-3 font-medium text-[#0f172a]">{m.user.name ?? "—"}</td>
                    <td className="px-5 py-3 text-[#475569]">{m.user.email}</td>
                    <td className="px-5 py-3 capitalize text-xs font-medium text-[#475569]">{m.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
