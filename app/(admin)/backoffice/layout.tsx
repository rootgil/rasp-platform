import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar adminEmail={session.user?.email ?? undefined} />
      <main className="lg:ml-[260px] pt-16 lg:pt-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
