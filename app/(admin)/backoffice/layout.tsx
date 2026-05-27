import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="ml-[260px]">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
