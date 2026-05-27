import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function BackofficeCustomersPage() {
  const users = await prisma.user.findMany({
    include: {
      memberships: { include: { organization: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" description={`${users.length} users registered`} />
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[#475569] uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f0]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-medium text-[#0f172a]">{user.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[#475569]">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      user.role === "admin"
                        ? "text-[#1e40af] bg-[#eff6ff] border-[#bfdbfe]"
                        : "text-[#475569] bg-[#f8fafc] border-[#e2e8f0]"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569]">
                    {user.memberships.map((m) => m.organization.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94a3b8]">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
