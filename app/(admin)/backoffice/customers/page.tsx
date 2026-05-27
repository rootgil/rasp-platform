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
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="bg-background border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary uppercase">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-background">
                  <td className="px-4 py-3 font-medium text-text-primary">{user.name ?? "-"}</td>
                  <td className="px-4 py-3 text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      user.role === "admin"
                        ? "text-low-text bg-brand-light border-[#bfdbfe]"
                        : "text-text-secondary bg-background border-border"
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">
                    {user.memberships.map((m) => m.organization.name).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{formatDate(user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
